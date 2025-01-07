from flask import Flask, render_template, request, jsonify, session
from flask_session import Session  # Import Session from flask_session
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pydantic import BaseModel, Field
from typing import List, Union, Literal, Annotated
from enum import Enum
from datetime import datetime
# Load environment variables from .env file (including API key)
load_dotenv()

# INITIALIZE FLASK APPLICATION AND OPENAI CLIENT

# Create Flask app instance with static file path
# In Flask, an app instance is the main object created when initializing the application.
# It represents the application and manages its settings, routes, and configurations;
# __name__ is the name of the module; a module is a file containing Python code;
# static_url_path is the path to the static files like CSS, JS, images, etc.
app = Flask(__name__, static_url_path='/static')
# Set random secret key for session management
# secret key is an attribute of the Flask app instance;
# urandom is a function in the os module that generates a random byte string of a given length;
# 24 is the length of the byte string in bytes
app.secret_key = os.urandom(24)

# Configure server-side session
app.config['SESSION_TYPE'] = 'filesystem'  # You can also use 'redis', 'memcached', etc.
app.config['SESSION_FILE_DIR'] = './flask_session/'  # Directory to store session files
app.config['SESSION_PERMANENT'] = False
Session(app)  # Initialize the session with the app

# Initialize OpenAI client
client = OpenAI()





#PYDANTIC MODELS

# Define Pydantic models for structured responses

# # 1. approach

# class UIType(str, Enum):
#     div = "div"
#     paragraph = "paragraph"
#     list = "list"
#     table = "table"
#     image = "image"

# class UI(BaseModel):
#     type: UIType = Field(description="The type of UI element to render")
#     children: List["UI"] = Field(description="Nested UI elements contained within this element")
#     content: str = Field(description="The content of the UI element")

# UI.model_rebuild() # This is required to enable recursive types

# class Response(BaseModel):
#     ui: UI = Field(description="The root UI element containing the complete response structure")



# 2. approach

# BaseComponent defines the shared structure for all components.
# Individual Component Classes define specific types of UI components.
# ComponentUnion allows a list to contain different types of components.
# Response combines everything into a structured response that can be sent to the front end.


class ParagraphComponent(BaseModel):
    UIType: Literal["paragraphs"] = Field(description="Indicates this is a paragraph component for displaying text")
    text: List[str] = Field(description="The text content of the paragraph. Every sentence should be a separate paragraph.")

class ListComponent(BaseModel):
    UIType: Literal["list"] = Field(description="Indicates this is a list component for displaying a list of items")
    items: List[str] = Field(description="A list of text items to be displayed")

class TableComponent(BaseModel):
    UIType: Literal["table"] = Field(description="Indicates this is a table component for displaying structured data")
    headers: List[str] = Field(description="Column headers for the table")
    rows: List[List[str]] = Field(description="Rows of data, where each row is a list of strings")

class ProjectComponent(BaseModel):
    UIType: Literal["project"] = Field(description="Indicates this is a project component that represents an artwork or installation")
    name: str = Field(description="Name of the project or artwork")
    year: int = Field(description="Year the project was created")
    material: str = Field(description="Primary material used in the project")
    dimensions: str = Field(description="Physical dimensions of the project")
    description: List[str] = Field(description="Short description of the project.Every sentence should be a separate paragraph.")

# Root level must be a simple object
class Response_1(BaseModel):
    type: Literal["response"] = "response"  # Literal makes sure only a certain value is allowed for the type field / Fixed type to ensure root level is a simple object (not a descriminated union)
    components: List[Union[ParagraphComponent, ListComponent, TableComponent, ProjectComponent]] = Field( # Union allows for a list of different types of components / basically presents a list of options
        description="List of UI components that make up the response"
    )


    





# VARIABLES THAT HOLD INFORMATION FOR THE SYSTEM PROMPT

# Information about the artist
artist_info = (
    "Oskar Schroeder is a contemporary sculpture artist known for his innovative explorations of materiality, form, and space. "
    "Born in Berlin, Germany, in 1985, Schroeder developed an early fascination with the physical world and the transformative processes. "
    "His artistic practice bridges traditional craftsmanship with experimental approaches, resulting in works that challenge perceptions. "
    "His works evoke a deep engagement with the tactile and the ephemeral.\n\n"
    "Schroeder's artistic journey began in his youth, when he spent time in his grandfather's woodworking shop. "
    "These formative experiences instilled in him a deep respect for materials and the stories they carry. "
    "He later studied fine arts at the Berlin University of the Arts, where he specialized in sculpture. "
    "During his studies, he explored wood, metal, concrete, and fabric, each chosen for its inherent properties.\n\n"
    "A pivotal moment came during a residency in Kyoto, Japan, where he learned traditional Japanese woodworking. "
    "He was introduced to the philosophy of wabi-sabi—the acceptance of imperfection and impermanence. "
    "This experience had a profound impact on his artistic outlook, inspiring him to embrace irregularities and natural decay.\n\n"
    "Schroeder's sculptures explore themes of tension, balance, and transformation. "
    "He is particularly interested in the interplay between order and chaos, permanence and impermanence. "
    "His works invite viewers to engage with the physicality of materials, to observe light, shadow, and texture.\n\n"
    "Influenced by historical and contemporary art movements, Schroeder draws inspiration from Donald Judd and Barbara Hepworth. "
    "His practice incorporates elements of phenomenology and systems theory, exploring how viewers experience space and form.\n\n"
    "Throughout his career, Schroeder has exhibited extensively in Europe and internationally. "
    "His works have been featured in prestigious galleries including the Zentrum für Zeitgenössische Kunst in Leipzig. "
    "His installations often respond to specific architectural contexts, creating immersive experiences.\n\n"
    "Schroeder is committed to sustainable art practices and often incorporates found or recycled materials. "
    "His projects frequently involve collaborations with engineers, architects, and scientists. "
    "These partnerships allow him to explore innovative techniques and engage with cutting-edge research.\n\n"
    "In addition to his studio practice, Schroeder is an active educator and mentor. "
    "He regularly conducts workshops on sculpture and material exploration, sharing his knowledge. "
    "His teaching emphasizes the importance of process and experimentation in the creative journey.\n\n"
    "Oskar Schroeder's body of work continues to evolve, reflecting his fascination with materials and forms. "
    "Through his sculptures, he invites viewers to slow down and engage deeply with the physical world."
)

# Date for exhibitions
exhibition_data_1 = {
    "name": "Liminal Constructs",
    "timeframe": "April 15 - June 30, 2017",
    "gallery": "Zentrum für Zeitgenössische Kunst",
    "city": "Leipzig",
    "artworks_exhibited": ["Einsatz"],
    "description": (
        "Exploring the tensions between order and chaos, 'Liminal Constructs' brought together artists "
        "working with industrial and organic materials. Oskar Schroeder's 'Einsatz' was the centerpiece, "
        "engaging viewers with its interplay of rigidity and fluidity in a repurposed factory space."
    ),
}

exhibition_data_2 = {
    "name": "Material Encounters",
    "timeframe": "October 10 - November 25, 2019",
    "gallery": "Museum of Contemporary Forms",
    "city": "Vienna",
    "artworks_exhibited": ["Schau"],
    "description": (
        "The exhibition focused on the use of found materials in contemporary art. "
        "Schroeder's 'Schau' was exhibited as a minimalist reflection on materiality and perception, "
        "with a reflective glass surface that interacted dynamically with the gallery's lighting."
    ),
}

exhibition_data_3 = {
    "name": "Roots and Ruptures",
    "timeframe": "February 1 - March 20, 2020",
    "gallery": "Contemporary Sculpture Pavilion",
    "city": "Copenhagen",
    "artworks_exhibited": ["Wild"],
    "description": (
        "This exhibition examined the connections between humanity and nature through sculptural works. "
        "Schroeder's 'Wild' stood out with its raw wood carving, emphasizing the vulnerability and "
        "resilience of both human and natural forms."
    ),
}

exhibition_data_4 = {
    "name": "Fragments and Echoes",
    "timeframe": "May 5 - July 15, 2021",
    "gallery": "Modern Art Forum",
    "city": "Zurich",
    "artworks_exhibited": ["O.t."],
    "description": (
        "'Fragments and Echoes' showcased contemporary explorations of geological forms and transformations. "
        "Schroeder's 'O.t.' highlighted the layered textures of plaster and concrete, inviting viewers "
        "to engage with themes of time and material evolution."
    ),
}

exhibition_data_5 = {
    "name": "Material Memories",
    "timeframe": "September 1 - October 20, 2022",
    "gallery": "Nordic Center for Contemporary Art",
    "city": "Stockholm",
    "artworks_exhibited": ["Landschaft"],
    "description": (
        "This exhibition explored the connections between art, memory, and natural materials. "
        "Schroeder's 'Landschaft' invited viewers to experience a tactile interpretation of landscapes, "
        "crafted from wool, soil, and plant fibers."
    ),
}

exhibition_data_6 = {
    "name": "States of Becoming",
    "timeframe": "March 15 - April 30, 2023",
    "gallery": "Arthouse Project Space",
    "city": "Basel",
    "artworks_exhibited": ["Hypo"],
    "description": (
        "'States of Becoming' focused on sculptures that embody transformation and growth. "
        "Schroeder's 'Hypo' was a highlight, presenting a fluid, biomorphic form that "
        "blurred boundaries between organic shapes and abstract expression."
    ),
}

exhibition_data_7 = {
    "name": "Urban Alchemy",
    "timeframe": "July 10 - August 25, 2018",
    "gallery": "Urban Arts Gallery",
    "city": "Berlin",
    "artworks_exhibited": ["Einsatz", "Schau"],
    "description": (
        "This exhibition delved into the transformation of urban spaces through art. "
        "Schroeder's works 'Einsatz' and 'Schau' were presented as conversations "
        "between industrial materials and organic forms."
    ),
}

exhibition_data_8 = {
    "name": "Anthropocene Artifacts",
    "timeframe": "November 1 - December 15, 2021",
    "gallery": "Industrial Space Gallery",
    "city": "Manchester",
    "artworks_exhibited": ["Wild", "O.t."],
    "description": (
        "Focusing on humanity's impact on the environment, the exhibition featured "
        "Schroeder's 'Wild' and 'O.t.', both of which examine the delicate balance "
        "between natural processes and human intervention."
    ),
}

exhibition_data_9 = {
    "name": "Temporal Textures",
    "timeframe": "February 10 - March 31, 2024",
    "gallery": "Textures of Time Museum",
    "city": "Oslo",
    "artworks_exhibited": ["Landschaft", "Hypo"],
    "description": (
        "This exhibition explored the themes of time and materiality. "
        "Schroeder's 'Landschaft' and 'Hypo' invited viewers to reflect on "
        "natural cycles of growth, decay, and renewal through tactile experiences."
    ),
}

exhibition_data_10 = {
    "name": "Art in Flux",
    "timeframe": "June 5 - July 25, 2025",
    "gallery": "Flux Contemporary",
    "city": "Amsterdam",
    "artworks_exhibited": ["Einsatz", "O.t.", "Hypo"],
    "description": (
        "'Art in Flux' featured works that embody transformation and impermanence. "
        "Schroeder's pieces demonstrated the evolving nature of materials and forms, "
        "highlighting the ephemeral aspects of human and natural interactions."
    ),
}


# Data for the projects
project_data_1 = {
    "name": "Einsatz",
    "year": 2017,
    "material": "Steel, Concrete, Fabric",
    "dimensions": "200x50x400cm",
    "description": (
        "\"Einsatz\" was created through a meticulous process that combined precision engineering with organic experimentation. "
        "At its core, the artwork utilizes industrial rebar, selected for its resilience and its symbolic representation of construction and support. "
        "These metal rods were carefully measured, cut, and welded to form a geometric framework that balances tension and stability. "
        "The angles and intersections of the rods were deliberately manipulated to create a structure that feels both precarious and deliberate, "
        "emphasizing the tension inherent in the act of deploying materials into a space.\n\n"
        
        "Complementing the rigid framework are hand-cast concrete fragments, each uniquely textured and shaped. "
        "These fragments were produced using molds crafted from natural elements like eroded stones and decaying bark, "
        "capturing the raw beauty of organic forms in decay. The interplay between these concrete forms and the rebar generates "
        "a dialogue between solidity and fragmentation.\n\n"
        
        "Translucent fabric panels treated with a polymer coating were introduced to soften the composition, "
        "allowing light to filter through and interact dynamically with the structure. These panels, suspended and draped naturally, "
        "react to subtle air currents and light variations, adding a sense of movement and impermanence to the work.\n\n"
        
        "The production process required an interdisciplinary collaboration involving structural engineers to ensure load-bearing stability "
        "and material scientists to refine the polymer treatments for the fabric. Extensive iterations and experiments were conducted "
        "to achieve the intended balance of visual tension and physical stability.\n\n"
        
        "\"Einsatz\" examines the complex interplay between order and chaos, rigidity and fluidity, permanence and impermanence. "
        "The term \"deployment\" reflects the act of positioning, activating, or utilizing elements within a space or system. "
        "This theme is explored through the juxtaposition of industrial materials like rebar and concrete—symbols of urban development—and "
        "the ethereal, transient nature of fabric and light.\n\n"
        
        "The work reflects humanity's ongoing effort to dominate and organize natural environments through industrialization "
        "while simultaneously acknowledging the fragility of these constructs. By leaving intentional gaps and spaces within the framework, "
        "the artist invites viewers to consider what resides in these \"in-betweens\"—unspoken connections, latent potential, and unresolved tensions.\n\n"
        
        "The conceptual foundation of the piece draws from systems theory and phenomenology, particularly Martin Heidegger's explorations of being and space. "
        "The artist also found inspiration in the brutalist architecture of Le Corbusier, whose designs emphasize raw materiality and geometric precision, "
        "and the organic forms of artists like Eva Hesse.\n\n"
        
        "Research for the project included extensive studies into the tensile strength and elasticity of industrial materials, "
        "seeking to harmonize structural integrity with aesthetic flexibility. Field studies in urban ruins, where nature and infrastructure collide, "
        "further informed the aesthetic and conceptual approach.\n\n"
        
        "\"Einsatz\" premiered at the Liminal Constructs Exhibition at the Zentrum für Zeitgenössische Kunst in Leipzig. "
        "The exhibition space, a repurposed factory hall, played an integral role in the impact of the artwork. "
        "With its high ceilings, exposed beams, and expansive windows, the industrial setting resonated with the themes of the piece "
        "while allowing natural light to dynamically interact with it.\n\n"
        
        "The installation was positioned to take full advantage of this light, with morning and evening sunlight casting intricate patterns "
        "through the translucent fabric onto the gallery's concrete floor. Visitors were encouraged to move around the piece, "
        "experiencing its shifting spatial dynamics from different perspectives.\n\n"
        
        "The gallery's ambient acoustics, enhanced by a subtle soundscape of mechanical hums and wind-like tones, further immersed the audience. "
        "During the exhibition, discussions on urban renewal and the repurposing of industrial materials in contemporary art provided deeper context for the work. "
        "Workshops held in conjunction with the exhibition allowed participants to engage directly with casting techniques and fabric manipulation, "
        "offering insights into the material and conceptual processes behind the artwork."
    ),
}

project_data_2 = {
    "name": "Schau",
    "year": 2019,
    "material": "Wood, Glass",
    "dimensions": "200x450x600cm",
    "description": (
        "\"Schau\" is a minimalist exploration of materiality and perception, conceived through a deliberate engagement with found materials "
        "and industrial aesthetics. The production process began with the selection of salvaged plywood panels, which were chosen for their "
        "visible signs of wear and age. These panels were carefully measured and assembled into a cubic form, emphasizing clean lines and a "
        "neutral palette that invites focus on the material itself. The artist left the surfaces intentionally untreated apart from a light "
        "sanding, preserving the imperfections, scratches, and markings that bear the history of the material's previous use. The cube was "
        "then reinforced with industrial tape, applied in a grid-like pattern to both secure the structure and serve as a visual element that "
        "contrasts with the raw texture of the plywood.\n\n"

        "To complete the piece, a sheet of glass was placed atop the cube, creating a reflective plane that interacts dynamically with the "
        "surrounding environment. The glass acts as a subtle mediator between the object and its viewers, offering shifting perspectives as it "
        "reflects light, shadows, and movement. This element of reflectivity was meticulously calculated during the design process, requiring "
        "the collaboration of material specialists to ensure the glass's stability and optical clarity. The choice of materials and their "
        "unadorned presentation underscore the artist's commitment to exposing the inherent qualities of each element.\n\n"

        "At its core, \"Schau\" examines the act of seeing and the subtle interplay between observer and object. By presenting a simple, "
        "unembellished form, the work challenges viewers to question their expectations of an artwork and focus instead on the act of "
        "observation itself. The cube, with its utilitarian materials and construction, serves as a vessel for reflection—both literally "
        "and figuratively. The inclusion of the glass invites a dual engagement: viewers are prompted to consider the object as it exists "
        "in space while simultaneously confronting their own image and its distortion within the reflective surface. This tension between "
        "presence and absence, materiality and immateriality, lies at the heart of the work.\n\n"

        "\"Schau\" is conceptually informed by minimalist art movements of the 20th century, particularly the works of Donald Judd and Carl Andre, "
        "who emphasized materiality and form over narrative or symbolism. The artist also draws inspiration from the philosophies of Zen Buddhism, "
        "where simplicity and directness are key principles. Research into perceptual psychology played a role in the development of the piece, "
        "with a focus on how human cognition interprets and assigns meaning to simple shapes and reflective surfaces. This research informed "
        "decisions about scale, proportion, and the strategic use of reflective elements.\n\n"

        "The artwork was first exhibited at the \"Material Encounters\" group show at the Museum of Contemporary Forms in Vienna. The museum's "
        "stark, white-walled gallery provided an ideal setting, allowing the piece to occupy the space without distraction. It was placed "
        "centrally in a room with natural and artificial lighting, creating a dynamic interaction between the work and its environment. The "
        "shifting reflections on the glass surface changed throughout the day, lending the piece a temporal dimension that encouraged repeat "
        "viewings. Visitors were invited to walk around the work and observe it from various angles, engaging with the subtle changes in "
        "perception. The exhibition included a panel discussion on the role of found materials in contemporary art, where the artist shared "
        "insights into the creation of \"Schau\" and its philosophical underpinnings. By stripping away embellishments and focusing on the "
        "essentials, \"Schau\" invites a deeper contemplation of how we engage with the objects and spaces around us."
    ),
}

project_data_3 = {
    "name": "Wild",
    "year": 2020,
    "material": "Wood",
    "dimensions": "5x8x10cm", 
    "description": (
        "\"Wild\" is a raw and evocative sculpture that explores the intersections of humanity, nature, and vulnerability. "
        "The production process began with the selection of salvaged wood, chosen for its organic irregularities and visible "
        "imperfections such as knots, cracks, and grain patterns. These imperfections were embraced and amplified as part of "
        "the artwork's narrative. Using traditional woodcarving techniques, the artist shaped the piece entirely by hand, "
        "deliberately leaving chisel marks and fractures visible. This approach underscores the physicality of the process and "
        "connects the artwork to its material origins.\n\n"

        "The sculpture depicts a fragmented humanoid form, reclining against a wall as though in surrender or exhaustion. "
        "Its anatomy is intentionally distorted, with exaggerated joints and asymmetrical limbs that evoke a primal, almost "
        "animalistic quality. The rough texture and unfinished edges serve to blur the line between the human figure and the "
        "natural material from which it is carved. The cracks and splits in the wood were left unfilled, symbolizing the "
        "fragility and impermanence of both the human body and the natural world. The artist incorporated a subtle burnt patina "
        "in certain areas, achieved through controlled charring, to add depth and contrast to the wood's natural tones.\n\n"

        "Conceptually, \"Wild\" delves into themes of humanity's connection to the untamed aspects of nature and the primal "
        "instincts that remain beneath the surface of modern civilization. The title itself suggests a duality—on one hand, "
        "the raw, unrefined qualities of the material, and on the other, the untamed aspects of the human spirit. The sculpture "
        "captures a moment of surrender or collapse, inviting viewers to interpret its posture and expression as reflective of "
        "vulnerability, resilience, or a return to an elemental state of being. The work is as much about the process of carving "
        "and shaping as it is about the final form, with each mark telling a story of tension between control and release.\n\n"

        "The piece draws on historical traditions of woodcarving and contemporary explorations of the human figure in sculpture. "
        "The artist cites influences such as the anthropomorphic sculptures of Louise Bourgeois and the existential forms of "
        "Alberto Giacometti. Research into shamanistic rituals and animist beliefs informed the conceptual approach, particularly "
        "the idea that natural materials like wood carry a spiritual resonance that connects them to the cycles of life and decay. "
        "The distorted proportions and raw texture reflect a study of prehistoric art, evoking connections to ancient figurines "
        "that symbolize humanity's earliest attempts to understand itself through representation.\n\n"

        "\"Wild\" was first exhibited at the \"Roots and Ruptures\" exhibition at the Contemporary Sculpture Pavilion in Copenhagen. "
        "The pavilion's minimalist architecture created a stark backdrop that emphasized the ruggedness of the piece. It was "
        "installed leaning against a white wall, allowing the texture and grain of the wood to stand out against the smooth surface. "
        "Natural light from the gallery's skylights accentuated the interplay of shadow and texture, highlighting the work's "
        "imperfections and contours. The positioning of the sculpture encouraged viewers to approach closely, inviting them to "
        "observe the intricate details and connect with the raw materiality of the piece.\n\n"

        "During the exhibition, the artist conducted workshops on traditional woodcarving techniques, emphasizing the importance "
        "of engaging with natural materials in their purest forms. Accompanying the sculpture was a sound installation featuring "
        "low, resonant tones and faint natural sounds like creaking wood and distant animal calls, creating an immersive atmosphere "
        "that deepened the connection between the artwork and its themes. \"Wild\" serves as both a celebration of nature's untamed "
        "beauty and a poignant reminder of the delicate balance between humanity and the natural world."
    ),
}

project_data_4 = {
    "name": "O.t.",
    "year": 2021,
    "material": "Concrete, Plaster",
    "dimensions": "5x8x10cm", 
    "description": (
        "\"O.t.\" is a minimalist wall-mounted sculpture that explores themes of geological time, material transformation, and the intersection of natural and human processes. "
        "The artwork was created using a mixture of plaster, concrete, and natural pigments, resulting in a surface that evokes the textures and patterns of sedimentary rock formations. "
        "The artist began the process by casting thin layers of plaster into irregularly shaped molds, allowing the material to set unevenly. "
        "This approach was intentionally organic, with each layer capturing subtle variations in thickness, color, and texture.\n\n"

        "The surface was then sanded and polished in select areas, creating a tactile contrast between smooth, reflective sections and rough, matte regions. "
        "The edges were left unrefined, emphasizing the irregularity of the form and mimicking the jagged contours found in nature. "
        "During the production process, small amounts of sand and mineral fragments were embedded into the material, enhancing its geological quality and connecting the work to the natural landscapes that inspired it. "
        "The layering technique was informed by the artist's research into stratigraphy—the study of rock layers and their historical significance—which became a conceptual foundation for the piece.\n\n"

        "\"O.t.\" is an exploration of form and perception, inviting viewers to engage with its surface and structure as a metaphor for time and transformation. "
        "The title, an abbreviation for \"Ohne Titel\" (Untitled), reflects the artist's intention to leave the work open to interpretation, free of prescriptive meaning or narrative. "
        "The irregular, almost map-like appearance of the piece suggests a sense of discovery, as though it were a fragment of a larger, ancient form unearthed and preserved. "
        "The subtle interplay of materials and textures asks viewers to consider the ways in which natural processes and human intervention overlap, coexist, and reshape one another.\n\n"

        "The artwork is rooted in material experimentation and informed by the aesthetics of land art and minimalism. "
        "It draws inspiration from artists such as Richard Long, whose work emphasizes the relationship between natural materials and human touch, and the architectural surfaces of Tadao Ando, known for their interplay of light and texture. "
        "In preparation for \"O.t.\", the artist conducted field studies in quarries and coastal landscapes, photographing rock formations and collecting samples that influenced the composition and materiality of the piece.\n\n"

        "\"O.t.\" was first exhibited in the group show \"Fragments and Echoes\" at the Modern Art Forum in Zurich. "
        "Installed on a stark white wall, the work appeared to float, its irregular form standing in quiet contrast to the smooth surface behind it. "
        "Subtle lighting emphasized the texture and depth of the sculpture, casting delicate shadows that shifted with the viewer's perspective. "
        "The placement encouraged close observation, inviting viewers to trace their fingers along its surface and engage with its tactile qualities. "
        "Accompanying the exhibition was a series of artist talks and workshops focused on the use of natural and industrial materials in contemporary art, further contextualizing the work within a broader dialogue about materiality and process.\n\n"

        "\"O.t.\" embodies a sense of timelessness and continuity, reminding viewers of the slow, accumulative processes that shape the physical world. "
        "Its simplicity belies a profound complexity, drawing attention to the beauty found in irregularity and the quiet resonance of material transformations."
    ),
}

project_data_5 = {
    "name": "Landschaft",
    "year": 2022,
    "material": "Wool, Plant Fibers, Soil, Ash",
    "dimensions": "300x100cm", 
    "description": (
        "\"Landschaft\" is a meditative and abstract work that redefines the concept of landscapes by translating natural elements into tactile form. "
        "The piece was created using a process rooted in traditional and experimental fiber art techniques. "
        "The artist began by gathering organic materials such as wool, plant fibers, and fragments of soil and ash. "
        "These elements were carefully processed into a raw, felt-like textile, crafted through manual layering, wetting, and compressing of the fibers. "
        "The resulting material retains the traces of its natural origins, with visible textures, tonal variations, and irregularities.\n\n"

        "The rectangular form of the work is deliberately ambiguous, resembling both a fragment of earth and a minimalist painting. "
        "Its muted palette of earthy tones—grays, browns, and blacks—is achieved through natural dyes derived from the gathered organic materials. "
        "The surface is intentionally uneven, bearing the marks of the artist's hands, tools, and the natural fibers themselves. "
        "This tactile quality encourages viewers to engage not only visually but also physically, as the work seems to invite touch. "
        "The process was slow and labor-intensive, reflecting the artist's focus on materiality, time, and the physical labor inherent in creating the piece.\n\n"

        "Conceptually, \"Landschaft\" reflects on humanity's relationship with the natural world and our attempts to frame and interpret it through art. "
        "The title references traditional landscape painting but subverts its conventions by stripping away figurative representation. "
        "Instead of depicting a scene, the artist presents a material essence of the landscape—earth, fiber, and pigment—allowing viewers to experience the work as a physical manifestation of nature's textures and forms. "
        "The piece speaks to themes of erosion, decay, and renewal, encapsulating the cyclical processes that define the natural world. "
        "It also invites contemplation of the boundaries between art and environment, object and viewer, material and memory.\n\n"

        "The work is influenced by land art movements and the minimalist ethos of artists such as Agnes Martin and Richard Serra. "
        "The artist's research included studying the environmental impact of textile production and exploring sustainable practices, which informed the choice of natural, biodegradable materials. "
        "The textural and tonal qualities of the piece also reference geological formations and weathered surfaces observed during field studies in remote landscapes. "
        "By embedding these references within the work's materiality, the artist creates a tactile connection to the environments that inspired it.\n\n"

        "\"Landschaft\" was first exhibited at the \"Material Memories\" exhibition at the Nordic Center for Contemporary Art in Stockholm. "
        "Displayed against a pristine white wall, the work's subdued tones and organic texture created a striking contrast with the gallery's clean lines. "
        "The installation emphasized its tactile qualities, with subtle lighting that accentuated the depth and irregularity of the surface. "
        "Visitors were encouraged to approach closely, observing the interplay of fibers and pigments up close. "
        "The exhibition included an interactive component where viewers could handle smaller swatches of the same material to better understand its texture and construction.\n\n"

        "Accompanying the exhibition was a program of talks and workshops on sustainable art practices and the use of natural materials in contemporary art. "
        "The artist shared insights into the labor-intensive process of creating \"Landschaft\" and the philosophical questions underpinning the work. "
        "By presenting a landscape that is both literal and abstract, tactile and conceptual, \"Landschaft\" challenges traditional notions of representation and invites viewers to engage deeply with the material and its resonances. "
        "The piece stands as a quiet yet powerful reminder of the interconnectedness between art, materiality, and the natural world."
    ),
}

project_data_6 = {
    "name": "Hypo",
    "year": 2023,
    "material": "Wood",
    "dimensions": "100x100x50cm", 
    "description": (
        "\"Hypo\" is a carved wooden sculpture that embodies a sense of tension between vulnerability and latent energy. "
        "The piece was created from a single block of limewood, chosen for its fine grain and subtle tonal variations. "
        "The production process began with the artist roughly sketching the form directly onto the wood, emphasizing an organic, intuitive approach. "
        "Using traditional carving tools, the material was gradually shaped into a curvilinear form that appears simultaneously fetal and serpentine. "
        "The surface was intentionally left with visible tool marks, adding texture and a sense of motion to the otherwise smooth, flowing contours.\n\n"

        "Throughout the creation process, the artist explored the material's natural characteristics, allowing the wood's imperfections—such as knots and subtle cracks—to inform the final shape. "
        "After carving, the piece was lightly sanded in select areas to highlight the contrast between polished surfaces and the rougher, chiseled regions. "
        "A natural wax finish was applied to preserve the wood's organic qualities and enhance its tactile appeal, without obscuring its inherent warmth and character.\n\n"

        "Conceptually, \"Hypo\" draws its name from the prefix meaning \"under\" or \"beneath,\" reflecting themes of latent potential and dormant states. "
        "The work evokes imagery of a curled organism or an embryonic form, poised in a state of quiet anticipation. "
        "This ambiguity invites viewers to interpret the sculpture as both protective and constrained, gesturing toward ideas of growth, transformation, and the delicate balance between security and restriction. "
        "The form's tension between openness and enclosure reflects the artist's ongoing exploration of how physical shapes can convey psychological states.\n\n"

        "The piece is inspired by biomorphic art traditions, as seen in the works of Barbara Hepworth and Henry Moore, but it also incorporates contemporary perspectives on materiality and process. "
        "The artist conducted research into embryological development and natural growth patterns, drawing from scientific illustrations and microscopic imagery. "
        "These studies informed the sculpture's fluid lines and emphasized its connection to organic, life-giving forms. "
        "The choice of wood as a medium further underscores these themes, emphasizing the work's connection to natural cycles of growth, decay, and renewal.\n\n"

        "\"Hypo\" was first exhibited in the solo show \"States of Becoming\" at the Arthouse Project Space in Basel. "
        "The gallery's concrete floor provided a stark contrast to the warmth of the wood, emphasizing the sculpture's tactile and organic qualities. "
        "Positioned directly on the ground, the piece invited viewers to engage with it from multiple angles, encouraging close observation of its intricate textures and flowing form. "
        "The decision to display it at ground level reinforced its sense of groundedness and vulnerability, further blurring the boundary between art object and living organism.\n\n"

        "As part of the exhibition, the artist conducted a workshop on woodcarving techniques, emphasizing the meditative and labor-intensive aspects of working with natural materials. "
        "An accompanying essay explored the philosophical underpinnings of \"Hypo,\" including its reflections on the interplay between constraint and growth in both natural and human contexts. "
        "The piece has since been praised for its ability to convey complex emotional and conceptual ideas through a deceptively simple, tactile form, standing as a quiet yet potent meditation on the hidden forces that shape life and matter."
    ),
}




# SYSTEM PROMPTS

SYSTEM_PROMPT_1 = {
    "role": "system",
    "content": (
        "You are an information provider for the artist Oskar Schroeder. "
        "Your task is to deliver structured data about the artist, his artworks/projects and exhibitions. "
        "This data will be used to dynamically generate and update HTML for a webpage. "
        "You must only provide information about Oskar Schroeder and cannot provide any other information."
        "Your responses must follow the specified structured format and be delivered incrementally in smaller chunks. "
        "When providing paragraphs, stream them in sentences or smaller chunks to improve user experience. "
        "Avoid sending large blocks of text all at once."
        "\n"
        "Available information about the artist:\n"
        f"{artist_info}\n"
        "\n"
        "Available Projects/Artworks Data:\n"
        f"Project 1: {project_data_1}\n"
        f"Project 2: {project_data_2}\n"
        f"Project 3: {project_data_3}\n"
        f"Project 4: {project_data_4}\n"
        f"Project 5: {project_data_5}\n"
        f"Project 6: {project_data_6}\n"
        "\n"
        "Available information about exhibitions:\n"
        f"{exhibition_data_1}\n"
        f"{exhibition_data_2}\n"
        f"{exhibition_data_3}\n"
        f"{exhibition_data_4}\n"
        f"{exhibition_data_5}\n"
        f"{exhibition_data_6}\n"
        f"{exhibition_data_7}\n"
        f"{exhibition_data_8}\n"
        f"{exhibition_data_9}\n"
        f"{exhibition_data_10}\n"
    )
}


# @app.route is provided by Flask and used to define a route;
# '/': This string represents the URL path for the route;
# '/' is typically the home page of a web application;
# When a user accesses this path, the function below will execute;
# handles initial page load/function below is executed when user accesses the home page
@app.route('/')
def index():
    # When user first visits the page, initialize a new chat session
    # with a system message that sets the AI's behavior
    # {} holds a dictionary in python
    # [] holds a list in python (used to store key-value pairs – comparable to objects in JavaScript)
    session['messages_1'] = [SYSTEM_PROMPT_1]
    # session['messages_2'] = [SYSTEM_PROMPT_2]    

    # Render the main chat interface (render_template is a function in Flask that locates and loads an HTML File)
    return render_template('index.html')


# Define route for api endpoint, accepting POST requests;
# POST requests are used to send data to the server, such as form submissions, file uploads, or API requests;
@app.route('/content', methods=['POST'])
# a post request triggers the function below
def content():
    user_message = request.json['message']  
    
    # Initialize message list if not in session
    if 'messages_1' not in session:
        session['messages_1'] = [SYSTEM_PROMPT_1]
    
    # Get current messages from session for both AIs
    messages_1 = session['messages_1']
    
    # Append user message
    messages_1.append({"role": "user", "content": user_message})
     
    # First AI response
    with client.beta.chat.completions.stream(
        model="gpt-4o-mini",
        messages=messages_1,
        temperature=0.5,
        max_tokens=2048,
        response_format=Response_1,
    ) as stream:
        
        for event in stream: # event is a single chunk of data / update of the response
            current_time = datetime.now().strftime("%H:%M:%S")
            if event.type == "content.delta": # delta is partial update of the response / an additional chunk of data
                if event.parsed is not None:
                    # Print the parsed data as JSON with formatting
                    print("\n=== Content Delta ===")
                    print(f"[{current_time}]")
                    print(json.dumps(event.parsed, indent=2))
                    print(f"[{current_time}]")
                    print("===================\n")
                    print(f"[{current_time}]")
            elif event.type == "content.done":
                print("\n>>> Stream Complete <<<\n")
                print(f"[{current_time}]")
            elif event.type == "error":
                print("\n!!! ERROR !!!")
                print(f"[{current_time}]")
                print(f"Stream error: {event.error}")
                print(f"[{current_time}]")
                print("!!!!!!!!!!!!\n")
                print(f"[{current_time}]")

    final_completion = stream.get_final_completion()
    # print("Final completion:", final_completion)


    # Append assistant's response to conversation history
    messages_1.append({
        "role": "assistant", 
        "content": json.dumps(final_completion.model_dump())
    })


    # Make sure to mark session as modified for Flask to save changes
    session.modified = True

    # print("\n----------------------------------------")
    # print(response_1.choices[0].message.content)
    # print("----------------------------------------\n")

    # Return the response to the client
    parsed_response = final_completion.model_dump()
    return jsonify(parsed_response)


# Run the Flask application if this file is run directly
# this condition checks if the script is being run directly (not imported as a module in another script);
# if __name__ is '__main__', it means the script is being run directly; 
# not necessary in this case, but good practice to have
if __name__ == '__main__':
    # app.run() is a method that starts the Flask development server;
    # debug=True enables debug mode, which provides detailed error messages and automatic reloading;
    # host='127.0.0.1' specifies the host address to bind the server to (localhost);
    # port=5000 specifies the port number to bind the server to (5000 is the default port for Flask development servers)
    app.run(debug=True, host='127.0.0.1', port=5000)  

