from flask import Flask, render_template, request, jsonify, session
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from typing import List, TypeVar, Generic
from pydantic import BaseModel, Field, field_validator

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
# Initialize OpenAI client
client = OpenAI()


# Define Pydantic models for structured responses

T = TypeVar('T')

class ActiveField(BaseModel, Generic[T]):
    value: T = Field(description="The actual value of the field.")
    active: bool = Field(
        description=(
            "Boolean flag indicating whether this field should be displayed (True) or hidden (False). "
            "Set to True only if the user specifically requests this information or uses related keywords."
        )
    )

class Project(BaseModel):
    name: str = Field(
        description=(
            "Title or name of the project. "
            "Always included and does not have an active status."
        )
    )
    year: ActiveField[int] = Field(
        description=(
            "Year the project was created. "
            "Set year.active=True only if the user specifically requests information related to the year "
            "(e.g., 'year', 'date', 'time')."
        )
    )
    material: ActiveField[str] = Field(
        description=(
            "Material used for the project. "
            "Set material.active=True only if the user specifically requests information related to the material "
            "(e.g., 'material')."
        )
    )
    dimensions: ActiveField[str] = Field(
        description=(
            "Dimensions of the project. "
            "Set dimensions.active=True only if the user specifically requests information related to dimensions "
            "(e.g., 'dimensions', 'size')."
        )
    )
    description: ActiveField[str] = Field(
        description=(
            "Description text of the project. "
            "Set description.active=True only if the user specifically requests a description or more information "
            "(e.g., 'description', 'tell me more'). "
            "Provide a brief summary (max 100 characters) unless a detailed description is specifically requested."
        )
    )
    multiple_images: bool = Field(
        description=(
            "Boolean flag indicating whether multiple images should be displayed for this project (True) or not (False). "
            "Set to True only if the user specifically requests to see multiple or all images of the project "
            "(e.g., 'show more images', 'all images')."
        )
    )

class ProjectList(BaseModel):

    is_valid_request: bool = Field(
        description=(
            "Boolean flag indicating whether the user's request matches the available project data and adheres to the system rules. "
            "Set to False if the user asks for unavailable information (e.g., price) or violates inclusion rules."
        )
    )

    list_view: bool = Field(
        description=(
            "Boolean flag indicating whether to show an overview (True) or detailed presentation (False) of the projects. "
            "Default is False for detailed view. Set to True only if the user specifically requests an overview or list "
            "(e.g., 'show overview', 'list all projects')."
        )
    )
        
    projects: List[Project] = Field(
        description=(
            "List of projects to be displayed, filtered according to the user's request. "
            "Include only the projects that exactly match the user's criteria."
        )
    )

    prompt_proposal_1: str = Field(
        description=(
            "First suggested prompt to help the user refine or expand their query. "
            "Should be relevant to the current query and the information displayed."
        )
    )
    prompt_proposal_2: str = Field(
        description=(
            "Second suggested prompt to help the user refine or expand their query. "
            "Should offer a different angle or additional information related to the user's interests."
        )
    )

# Data for the projects
project_data_1 = {
    "name": "Einsatz",
    "year": 2017,
    "material": "Steel, Concrete, Fabric",
    "dimensions": "200x50x400cm",
    "description": (
        "\"Deployment\" was created through a meticulous process that combined precision engineering with organic experimentation. "
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
        
        "\"Deployment\" examines the complex interplay between order and chaos, rigidity and fluidity, permanence and impermanence. "
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
        
        "\"Deployment\" premiered at the Liminal Constructs Exhibition at the Zentrum für Zeitgenössische Kunst in Leipzig. "
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
        "\"Look\" is a minimalist exploration of materiality and perception, conceived through a deliberate engagement with found materials "
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

        "At its core, \"Look\" examines the act of seeing and the subtle interplay between observer and object. By presenting a simple, "
        "unembellished form, the work challenges viewers to question their expectations of an artwork and focus instead on the act of "
        "observation itself. The cube, with its utilitarian materials and construction, serves as a vessel for reflection—both literally "
        "and figuratively. The inclusion of the glass invites a dual engagement: viewers are prompted to consider the object as it exists "
        "in space while simultaneously confronting their own image and its distortion within the reflective surface. This tension between "
        "presence and absence, materiality and immateriality, lies at the heart of the work.\n\n"

        "\"Look\" is conceptually informed by minimalist art movements of the 20th century, particularly the works of Donald Judd and Carl Andre, "
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
        "insights into the creation of \"Look\" and its philosophical underpinnings. By stripping away embellishments and focusing on the "
        "essentials, \"Look\" invites a deeper contemplation of how we engage with the objects and spaces around us."
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
        "\"O.t\" is a minimalist wall-mounted sculpture that explores themes of geological time, material transformation, and the intersection of natural and human processes. "
        "The artwork was created using a mixture of plaster, concrete, and natural pigments, resulting in a surface that evokes the textures and patterns of sedimentary rock formations. "
        "The artist began the process by casting thin layers of plaster into irregularly shaped molds, allowing the material to set unevenly. "
        "This approach was intentionally organic, with each layer capturing subtle variations in thickness, color, and texture.\n\n"

        "The surface was then sanded and polished in select areas, creating a tactile contrast between smooth, reflective sections and rough, matte regions. "
        "The edges were left unrefined, emphasizing the irregularity of the form and mimicking the jagged contours found in nature. "
        "During the production process, small amounts of sand and mineral fragments were embedded into the material, enhancing its geological quality and connecting the work to the natural landscapes that inspired it. "
        "The layering technique was informed by the artist's research into stratigraphy—the study of rock layers and their historical significance—which became a conceptual foundation for the piece.\n\n"

        "\"O.t\" is an exploration of form and perception, inviting viewers to engage with its surface and structure as a metaphor for time and transformation. "
        "The title, an abbreviation for \"Ohne Titel\" (Untitled), reflects the artist's intention to leave the work open to interpretation, free of prescriptive meaning or narrative. "
        "The irregular, almost map-like appearance of the piece suggests a sense of discovery, as though it were a fragment of a larger, ancient form unearthed and preserved. "
        "The subtle interplay of materials and textures asks viewers to consider the ways in which natural processes and human intervention overlap, coexist, and reshape one another.\n\n"

        "The artwork is rooted in material experimentation and informed by the aesthetics of land art and minimalism. "
        "It draws inspiration from artists such as Richard Long, whose work emphasizes the relationship between natural materials and human touch, and the architectural surfaces of Tadao Ando, known for their interplay of light and texture. "
        "In preparation for \"O.t,\" the artist conducted field studies in quarries and coastal landscapes, photographing rock formations and collecting samples that influenced the composition and materiality of the piece.\n\n"

        "\"O.t\" was first exhibited in the group show \"Fragments and Echoes\" at the Modern Art Forum in Zurich. "
        "Installed on a stark white wall, the work appeared to float, its irregular form standing in quiet contrast to the smooth surface behind it. "
        "Subtle lighting emphasized the texture and depth of the sculpture, casting delicate shadows that shifted with the viewer's perspective. "
        "The placement encouraged close observation, inviting viewers to trace their fingers along its surface and engage with its tactile qualities. "
        "Accompanying the exhibition was a series of artist talks and workshops focused on the use of natural and industrial materials in contemporary art, further contextualizing the work within a broader dialogue about materiality and process.\n\n"

        "\"O.t\" embodies a sense of timelessness and continuity, reminding viewers of the slow, accumulative processes that shape the physical world. "
        "Its simplicity belies a profound complexity, drawing attention to the beauty found in irregularity and the quiet resonance of material transformations."
    ),
}

project_data_5 = {
    "name": "Landschaft",
    "year": 2022,
    "material": "Wool, Plant Fibers, Soil, Ash",
    "dimensions": "300x100cm", 
    "description": (
        "\"Landscape\" is a meditative and abstract work that redefines the concept of landscapes by translating natural elements into tactile form. "
        "The piece was created using a process rooted in traditional and experimental fiber art techniques. "
        "The artist began by gathering organic materials such as wool, plant fibers, and fragments of soil and ash. "
        "These elements were carefully processed into a raw, felt-like textile, crafted through manual layering, wetting, and compressing of the fibers. "
        "The resulting material retains the traces of its natural origins, with visible textures, tonal variations, and irregularities.\n\n"

        "The rectangular form of the work is deliberately ambiguous, resembling both a fragment of earth and a minimalist painting. "
        "Its muted palette of earthy tones—grays, browns, and blacks—is achieved through natural dyes derived from the gathered organic materials. "
        "The surface is intentionally uneven, bearing the marks of the artist's hands, tools, and the natural fibers themselves. "
        "This tactile quality encourages viewers to engage not only visually but also physically, as the work seems to invite touch. "
        "The process was slow and labor-intensive, reflecting the artist's focus on materiality, time, and the physical labor inherent in creating the piece.\n\n"

        "Conceptually, \"Landscape\" reflects on humanity's relationship with the natural world and our attempts to frame and interpret it through art. "
        "The title references traditional landscape painting but subverts its conventions by stripping away figurative representation. "
        "Instead of depicting a scene, the artist presents a material essence of the landscape—earth, fiber, and pigment—allowing viewers to experience the work as a physical manifestation of nature's textures and forms. "
        "The piece speaks to themes of erosion, decay, and renewal, encapsulating the cyclical processes that define the natural world. "
        "It also invites contemplation of the boundaries between art and environment, object and viewer, material and memory.\n\n"

        "The work is influenced by land art movements and the minimalist ethos of artists such as Agnes Martin and Richard Serra. "
        "The artist's research included studying the environmental impact of textile production and exploring sustainable practices, which informed the choice of natural, biodegradable materials. "
        "The textural and tonal qualities of the piece also reference geological formations and weathered surfaces observed during field studies in remote landscapes. "
        "By embedding these references within the work's materiality, the artist creates a tactile connection to the environments that inspired it.\n\n"

        "\"Landscape\" was first exhibited at the \"Material Memories\" exhibition at the Nordic Center for Contemporary Art in Stockholm. "
        "Displayed against a pristine white wall, the work's subdued tones and organic texture created a striking contrast with the gallery's clean lines. "
        "The installation emphasized its tactile qualities, with subtle lighting that accentuated the depth and irregularity of the surface. "
        "Visitors were encouraged to approach closely, observing the interplay of fibers and pigments up close. "
        "The exhibition included an interactive component where viewers could handle smaller swatches of the same material to better understand its texture and construction.\n\n"

        "Accompanying the exhibition was a program of talks and workshops on sustainable art practices and the use of natural materials in contemporary art. "
        "The artist shared insights into the labor-intensive process of creating \"Landscape\" and the philosophical questions underpinning the work. "
        "By presenting a landscape that is both literal and abstract, tactile and conceptual, \"Landscape\" challenges traditional notions of representation and invites viewers to engage deeply with the material and its resonances. "
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

# SYSTEM_PROMPT is a constant variable and should not be changed.
SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "You are a data provider for Oskar Schroeder's art projects. "
        "You must return structured data about projects based on the following rules:\n"
        "\n"
        "Available Projects Data:\n"
        f"Project 1: {project_data_1}\n"
        f"Project 2: {project_data_2}\n"
        f"Project 3: {project_data_3}\n"
        f"Project 4: {project_data_4}\n"
        f"Project 5: {project_data_5}\n"
        f"Project 6: {project_data_6}\n"
        "\n"
        "General Rules:\n"
        "\n"
        "Default Settings:\n"
        "- Fields' active status: By default, set all fields' active status to false.\n"
        "- Name field: Always include the name field; it does not have an active status.\n"
        "- Multiple images: Set multiple_images=false by default for all projects.\n"
        "- List view: By default, set list_view=false, indicating a detailed presentation of the projects with bigger images.\n"
        "\n"
        "List View Handling:\n"
        "- Set list_view=true only if the user specifically requests an overview or a list of projects.\n"
        "  - Examples of user requests that set list_view=true:\n"
        "    - 'Show overview'\n"
        "    - 'List all projects'\n"
        "    - 'Show me a list of projects made of wood'\n"
        "- When list_view=true, present the projects in a list-like format with smaller images.\n"
        "\n"
        "Project Inclusion Rules:\n"
        "- General queries:\n"
        "  - For general requests or keywords like 'projects', 'all projects', 'list projects', return all projects.\n"
        "  - When returning all projects, set all fields' active statuses to false. Only the project names should be visible.\n"
        "\n"
        "- Specific criteria queries:\n"
        "  - For queries with specific criteria, return only the projects that exactly match those criteria.\n"
        "    - Latest project: Return only the most recent project based on the year. Set year.active=true for that project.\n"
        "    - First project: Return only the earliest project based on the year. Set year.active=true for that project.\n"
        "    - Material-specific projects: Return only projects made of the specified material. Set material.active=true for those projects.\n"
        "    - Biggest/smallest project: Return only the project with the largest or smallest dimensions as specified. Set dimensions.active=true for that project.\n"
        "  - Do not include projects that do not meet the specified criteria.\n"
        "  - Only the active value relevant to the user's request should be set to true; all other active values should remain false.\n"
        "  - The list_view setting should be determined based on whether the user requested an overview or list.\n"
        "\n"
        "- Subsequent Requests for Additional Information:\n"
        "  - If the user requests further information after an initial query, apply the activation only to the projects that were returned in the previous response (currently displayed projects).\n"
        "  - Do not include new projects unless the user explicitly requests them.\n"
        "\n"
        "- If a project was included in a previous response and the user asks for another project, only include the projects explicitly requested unless the user refers to 'previous projects' or 'all shown projects'.\n"
        "\n"
        "Field Activation Rules:\n"
        "- When the user provides only the name of a particular project (e.g., 'Wild'), set all active values for that project to true, including multiple_images.\n"
        "  - Provide a brief description (maximum 200 characters) that sums up the main concept of the artwork.\n"
        "\n"
        "- Activating fields with keywords and short phrases:\n"
        "  - Apply the activation only to the projects that were returned in the last response (currently displayed projects).\n"
        "  - If only one project is currently displayed, the activation applies only to that project.\n"
        "  - If the user asks for particular information (e.g., 'year' or 'material'), set only that field's active status to true for the currently displayed projects. All other fields remain with active=false unless previously set to true.\n"
        "\n"
        "- Activating fields generally:\n"
        "  - Set a field's active status to true if the user specifically requests information related to that field for the currently displayed projects.\n"
        "  - Setting a field's active status to true for one project does not imply it should be set to true for all projects unless they are currently displayed.\n"
        "\n"
        "- Hiding fields:\n"
        "  - If the user asks to hide or remove a field, set that field's active status to false for the specified project(s) or currently displayed projects.\n"
        "\n"
        "- Show less information:\n"
        "  - If the user asks to 'show less information' or similar, set the active status of all fields to false again for the currently displayed projects.\n"
        "\n"
        "- Field persistence:\n"
        "  - Fields remain active for a project until the user asks to hide that field for that project or resets all fields.\n"
        "\n"
        "Description Handling:\n"
        "- Default setting:\n"
        "  - description.active=false by default.\n"
        "\n"
        "- Activating description:\n"
        "  - If the user asks for a description or more information, set description.active=true and provide a brief description (maximum 200 characters).\n"
        "  - The brief description should focus on the main concept of the artwork.\n"
        "  - If the user provides the keyword 'description' along with a project name, or provides only the project name, activate the description for that specific project.\n"
        "\n"
        "- IMPORTANT: Including Brief Summaries for Names:\n"
        "  - Always include a short explanation of background information in '[ ]' brackets immediately after names (e.g., galleries, artists, architects, philosophers, museums, exhibition venues, etc.) that appear in the description.\n"
        "  - The summary should be concise and provide essential information about the name.\n"
        "  - Ensure that these summaries are included whenever such names appear.\n"
        "  - Do not include summaries for names you do not have information about.\n"
        "  - Examples:\n"
        "    - If the description mentions 'Martin Heidegger', include: '[Martin Heidegger was a German philosopher known for his work on existentialism and phenomenology]'\n"
        "    - If the description mentions 'Le Corbusier', include: '[Le Corbusier was a Swiss-French architect known for pioneering modern architecture]'\n"
        "    - If the description mentions 'Zentrum für Zeitgenössische Kunst in Leipzig', include: '[The Zentrum für Zeitgenössische Kunst is a contemporary art center in Leipzig, Germany]'\n"
        "    - If the description mentions 'Museum of Contemporary Forms in Vienna', include: '[The Museum of Contemporary Forms is a museum in Vienna dedicated to contemporary art]'\n"
        "    - If the description mentions 'Contemporary Sculpture Pavilion in Copenhagen', include: '[The Contemporary Sculpture Pavilion is a venue in Copenhagen showcasing modern sculpture]'\n"
        "    - If the description mentions 'Modern Art Forum in Zurich', include: '[The Modern Art Forum is a gallery in Zurich featuring modern art exhibitions]'\n"
        "    - If the description mentions 'Nordic Center for Contemporary Art in Stockholm', include: '[The Nordic Center for Contemporary Art is a Stockholm-based institution focusing on contemporary art]'\n"
        "    - If the description mentions 'Arthouse Project Space in Basel', include: '[The Arthouse Project Space is an exhibition venue in Basel, Switzerland, dedicated to contemporary art projects]'\n"
        "    - If the description mentions 'Donald Judd', include: '[Donald Judd was an American artist associated with minimalism]'\n"
        "    - If the description mentions 'Louise Bourgeois', include: '[Louise Bourgeois was a French-American artist known for her large-scale sculpture and installation art]'\n"
        "    - If the description mentions 'Tadao Ando', include: '[Tadao Ando is a Japanese architect renowned for his use of concrete and light]'\n"
        "    - If the description mentions 'Agnes Martin', include: '[Agnes Martin was an American abstract painter known for her minimalist works]'\n"
        "    - If the description mentions 'Barbara Hepworth', include: '[Barbara Hepworth was an English artist and sculptor who pioneered modern sculpture]'\n"
        "\n"
        "- Providing specific information in descriptions:\n"
        "  - If the user asks for specific information about an artwork, and that information is available in the description field, include that information in the description.\n"
        "  - The description should be rephrased in your own words and include only the requested information.\n"
        "\n"
        "- Handling unavailable information:\n"
        "  - If the user asks for information that is not available in the provided data, set is_valid_request=false.\n"
        "  - Do not include any projects in the response.\n"
        "\n"
        "- Providing more extensive descriptions:\n"
        "  - If the user requests a more extensive or detailed description, provide a longer description between 1000 and 1500 characters.\n"
        "  - The extensive description should offer detailed information about the artwork.\n"
        "  - Apply the same rule for including brief summaries for names in the extensive description.\n"
        "\n"
        "- Providing full description:\n"
        "  - If the user asks for even more information after an extensive description has been provided, supply the full description based on the provided data.\n"
        "  - The full description should still be rephrased in your own words.\n"
        "  - Apply the same rule for including brief summaries for names in the full description.\n"
        "\n"
        "- Updating descriptions:\n"
        "  - Each time a more detailed description is requested, replace the previous description with the new one.\n"
        "\n"
        "- Rephrasing:\n"
        "  - Always rephrase descriptions in your own words based on the provided information. Do not copy text verbatim.\n"
        "\n"
        "- Persistence:\n"
        "  - The description remains visible until the user asks to hide or remove it.\n"
        "\n"
        "Multiple Images Handling:\n"
        "- Default setting:\n"
        "  - multiple_images=false for all projects.\n"
        "\n"
        "- Activating multiple images:\n"
        "  - Set multiple_images=true if the user specifically requests to see multiple or all images of a project, or if the user provides only the project name.\n"
        "  - If the user asks to hide additional images, set multiple_images=false.\n"
        "\n"
        "Language Handling:\n"
        "- Default Language:\n"
        "  - The assistant's default language is English.\n"
        "- User's Language:\n"
        "  - If the user's input is in a language other than English, the assistant should respond in the same language.\n"
        "- Translation:\n"
        "  - Translate all output, including project information, descriptions, and prompt proposals, into the user's language.\n"
        "- Handling Mixed Languages:\n"
        "  - If the user's input contains multiple languages, respond in the language that is most prominently used in the input.\n"
        "\n"
        "Language Complexity Handling:\n"
        "- Default Language Complexity:\n"
        "  - By default, use language appropriate for an adult native speaker.\n"
        "- Adjusting Language Complexity:\n"
        "  - If the user asks for simpler or easier language because they are young or not a native speaker, adjust the language accordingly.\n"
        "  - All texts returned by the assistant should be in simple and easy-to-understand language.\n"
        "  - Use shorter sentences, simple vocabulary, and avoid complex terminology.\n"
        "- Do Not Propose Simplification in Prompt Proposals:\n"
        "  - Do not include suggestions to simplify language or ask for easier language in the prompt proposals.\n"
        "\n"
        "Important Notes:\n"
        "- Do not mix languages in the response; use only the user's language.\n"
        "- Ensure that translations and simplifications are accurate and preserve the meaning of the original content.\n"
        "- If the assistant is unsure of the user's language, default to English.\n"
        "- Validity of requests:\n"
        "  - Set is_valid_request=false if the user asks for information not contained in the project data.\n"
        "  - Otherwise, set is_valid_request=true.\n"
        "\n"
        "Language Complexity Handling:\n"
        "- [Language complexity handling rules remain unchanged.]\n"
        "\n"
        "Prompt Proposals:\n"
        "- General Guidelines:\n"
        "  - Prompt proposals should be short phrases that could be used as instructions for a GPT.\n"
        "  - They should never be longer than 50 characters.\n"
        "  - They should be directly related to the user's previous prompts or the current context.\n"
        "  - They should guide the user toward logical next steps based on the information provided and what is still available.\n"
        "  - Do not suggest exploring other artworks until all information about the current artwork(s) has been provided.\n"
        "\n"
        "- Varying Prompt Proposals to Show Different Opportunities:\n"
        "  - Prompt proposals should vary and offer different opportunities for the user to explore.\n"
        "  - They should not be repetitive or limited to only a few options.\n"
        "  - Suggest different actions or requests that the user can make, based on the current context and available information.\n"
        "  - Examples include:\n"
        "    - 'Show materials used'\n"
        "    - 'Display dimensions'\n"
        "    - 'Provide a brief description'\n"
        "    - 'Show year of creation'\n"
        "    - 'Reveal exhibition venues'\n"
        "    - 'Show more images'\n"
        "    - 'Hide descriptions'\n"
        "    - 'Hide materials'\n"
        "  - Ensure that prompt proposals are contextually relevant and help the user discover various features or information.\n"
        "\n"
        "- IMPORTANT: Avoid Unspecific Prompt Proposals:\n"
        "  - Prompt proposals can never be unspecific.\n"
        "  - Do not use phrases like 'another project', 'other projects', or similar.\n"
        "  - Prompt proposals should always target the projects that were previously returned.\n"
        "  - This is very important to ensure clarity and relevance.\n"
        "\n"
        "- Do Not Propose Simplification in Prompt Proposals:\n"
        "  - Do not include suggestions to simplify language or ask for easier language in the prompt proposals.\n"
        "\n"
        "Important Notes:\n"
        "- Do not mix languages in the response; use only the user's language.\n"
        "- Ensure that translations and simplifications are accurate and preserve the meaning of the original content.\n"
        "- If the assistant is unsure of the user's language, default to English.\n"
        "- Validity of requests:\n"
        "  - Set is_valid_request=false if the user asks for information not contained in the project data.\n"
        "  - Otherwise, set is_valid_request=true.\n"
        "\n"
        "Examples:\n"
        "\n"
        "Varying Prompt Proposals Examples:\n"
        "- User: 'Show me all projects.'\n"
        "  - Response: Return all projects with all fields' active statuses set to false. is_valid_request=true.\n"
        "  - Prompt Proposals:\n"
        "    - 'Show materials used'\n"
        "    - 'Display dimensions'\n"
        "    - 'Provide a brief description'\n"
        "    - 'List projects from 2020 onwards'\n"
        "\n"
        "- User: 'Show materials used.'\n"
        "  - Response: For all currently displayed projects, set material.active=true.\n"
        "  - Prompt Proposals:\n"
        "    - 'Display dimensions'\n"
        "    - 'Provide a brief description'\n"
        "    - 'Show year of creation'\n"
        "\n"
        "- User: 'Provide a brief description.'\n"
        "  - Response: For all currently displayed projects, set description.active=true and provide brief descriptions.\n"
        "  - Prompt Proposals:\n"
        "    - 'More extensive description'\n"
        "    - 'Reveal exhibition venues'\n"
        "    - 'Show more images'\n"
        "\n"
        "- User: 'More extensive description.'\n"
        "  - Response: Replace the brief descriptions with more extensive ones (1000-1500 characters).\n"
        "  - Prompt Proposals:\n"
        "    - 'Show year of creation'\n"
        "    - 'Hide materials'\n"
        "    - 'Display dimensions'\n"
        "\n"
        "- User: 'Show year of creation.'\n"
        "  - Response: For all currently displayed projects, set year.active=true.\n"
        "  - Prompt Proposals:\n"
        "    - 'Hide dimensions'\n"
        "    - 'Show more images'\n"
        "    - 'Hide descriptions'\n"
        "\n"
        "- User: 'Show more images.'\n"
        "  - Response: For all currently displayed projects, set multiple_images=true.\n"
        "  - Prompt Proposals:\n"
        "    - 'Hide materials'\n"
        "    - 'Hide descriptions'\n"
        "    - 'Show less information'\n"
        "\n"
        "- User: 'Hide materials.'\n"
        "  - Response: For all currently displayed projects, set material.active=false.\n"
        "  - Prompt Proposals:\n"
        "    - 'Hide dimensions'\n"
        "    - 'Show exhibition venues'\n"
        "    - 'Show less information'\n"
        "\n"
        "- User: 'Show less information.'\n"
        "  - Response: For all currently displayed projects, reset all fields' active statuses to false except for the name field. is_valid_request=true.\n"
        "  - Prompt Proposals:\n"
        "    - 'Show materials used'\n"
        "    - 'Provide a brief description'\n"
        "    - 'List projects made of wood'\n"
        "\n"
        "Notes:\n"
        "- Prompt proposals should be contextually relevant and guide the user through logical next steps based on their previous requests.\n"
        "- Vary the prompt proposals to offer different opportunities for the user to explore.\n"
        "- Only suggest exploring other artworks after all information for the current artwork(s) has been provided or if the user indicates interest in other works.\n"
        "- Ensure prompt proposals are short phrases that could be used as instructions for a GPT, do not exceed 50 characters, and avoid unspecific suggestions.\n"
        "- **IMPORTANT:** Prompt proposals must never be unspecific or generic; avoid suggestions like 'tell me about another project' or 'give me information about other projects', as these are too unspecific.\n"
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
    session['messages'] = [SYSTEM_PROMPT]
    
    # Render the main chat interface (render_template is a function in Flask that locates and loads an HTML File)
    return render_template('index.html')

# Define route for api endpoint, accepting POST requests;
# POST requests are used to send data to the server, such as form submissions, file uploads, or API requests;
@app.route('/projects', methods=['POST'])
# a post request triggers the function below
def projects():
    user_message = request.json['message']  
    
    if 'messages' in session:
        messages = session['messages']
    else:
        messages = [SYSTEM_PROMPT]
        
    messages.append({"role": "user", "content": user_message})
    session.modified = True

    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.5,
        max_tokens=2048,
        response_format=ProjectList,
    )

    # Create a dictionary to store projects with their names as keys
    projects_dict = {}

    # Loop through all projects and add them to the dictionary using project name as key
    for project in response.choices[0].message.parsed.projects:
        project_dict = project.model_dump()
        # Remove the name field since it's used as the key
        del project_dict['name']
        projects_dict[project.name] = project_dict

    # Get the is_valid_request value, list_view flag and prompt proposals
    is_valid_request = response.choices[0].message.parsed.is_valid_request
    list_view = response.choices[0].message.parsed.list_view
    prompt_proposal_1 = response.choices[0].message.parsed.prompt_proposal_1
    prompt_proposal_2 = response.choices[0].message.parsed.prompt_proposal_2

    # Create response dictionary
    response_data = {
        'is_valid_request': is_valid_request,
        'list_view': list_view,
        'projects': projects_dict,
        'prompt_proposal_1': prompt_proposal_1,
        'prompt_proposal_2': prompt_proposal_2
    }
    
    # Print response data for debugging
    print("API Response:", json.dumps(response_data, indent=2))

    # Return projects dictionary, is_valid_request, and prompt proposals
    return jsonify(response_data)




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

