import os
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGO_URI")
db_name = os.getenv("MONGO_DB", "ces_db")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client[db_name]
movies_collection = db["movies"]

movies_collection.delete_many({})

movies = [
    {
        "title": "Sinners",
        "genre": "Horror",
        "status": "currently_running",
        "description": "Trying to leave their troubled lives behind, twin brothers return to their hometown to start again, only to discover that an even greater evil is waiting to welcome them back.",
        "rating": "R",
        "poster_url": "https://image.tmdb.org/t/p/original/yqsCU5XOP2mkbFamzAqbqntmfav.jpg",
        "trailer_url": "https://youtu.be/bKGxHflevuk?si=WgulYGfvw29Ye3ku",
    },
    {
        "title": "F1: The Movie",
        "genre": "Action",
        "status": "currently_running",
        "description": "A Formula One driver comes out of retirement to mentor and team up with a younger driver.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/9PXZIUsSDh4alB80jheWX4fhZmy.jpg",
        "trailer_url": "https://youtu.be/8yh9BPUBbbQ?si=0tFiPZ4NeoOEFuWm",
    },
    {
        "title": "How to Train Your Dragon",
        "genre": "Animation",
        "status": "currently_running",
        "description": "The friendship between Hiccup, an inventive Viking, and Toothless, a Night Fury dragon, becomes the key to both species forging a new future together.",
        "rating": "PG",
        "poster_url": "https://image.tmdb.org/t/p/original/41dfWUWtg1kUZcJYe6Zk6ewxzMu.jpg",
        "trailer_url": "https://youtu.be/22w7z_lT6YM?si=2qU3DY6QQUMSHsJJ",
    },
    {
        "title": "Superman",
        "genre": "Action",
        "status": "currently_running",
        "description": "Superman must reconcile his Kryptonian heritage with his human upbringing as reporter Clark Kent, as the embodiment of truth, justice and the human way.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/oe5TVF6GQDESLsGiFrN6GyJEekh.jpg",
        "trailer_url": "https://youtu.be/Ox8ZLF6cGM0?si=7YW4c6u_V07Sa2cb",
    },
    {
        "title": "Thunderbolts*",
        "genre": "Action",
        "status": "currently_running",
        "description": "After finding themselves ensnared in a death trap, an unconventional team of antiheroes must go on a dangerous mission that will force them to confront the darkest corners of their pasts.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/vnfgoohSwKNOcRfJOPULXTvX0cu.jpg",
        "trailer_url": "https://youtu.be/-sAOWhvheK8?si=9lhdWCMzz659h29X",
    },
    {
        "title": "Avatar: Fire and Ash",
        "genre": "Sci-Fi",
        "status": "coming_soon",
        "description": "Jake and Neytiri's family grapples with grief, encountering a new aggressive Na'vi tribe as the conflict on Pandora escalates.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/5bxrxnRaxZooBAxgUVBZ13dpzC7.jpg",
        "trailer_url": "https://youtu.be/nb_fFj_0rq8?si=D5zuv2gfHGCbbVG_",
    },
    {
        "title": "One Battle After Another",
        "genre": "Drama",
        "status": "coming_soon",
        "description": "When their evil enemy resurfaces after 16 years, a group of ex-revolutionaries reunite to rescue the daughter of one of their own.",
        "rating": "R",
        "poster_url": "https://image.tmdb.org/t/p/original/lbBWwxBht4JFP5PsuJ5onpMqugW.jpg",
        "trailer_url": "https://youtu.be/feOQFKv2Lw4?si=oNAoex1YM--PF-m_",
    },
    {
        "title": "Zootopia 2",
        "genre": "Animation",
        "status": "coming_soon",
        "description": "Brave rabbit cop Judy Hopps and her friend, the fox Nick Wilde, team up again to crack a new case, the most perilous and intricate of their careers.",
        "rating": "PG",
        "poster_url": "https://image.tmdb.org/t/p/original/bjUWGw0Ao0qVWxagN3VCwBJHVo6.jpg",
        "trailer_url": "https://youtu.be/BjkIOU5PhyQ?si=tRuhH-V8TBDD-ydX",
    },
    {
        "title": "Mission: Impossible - The Final Reckoning",
        "genre": "Action",
        "status": "coming_soon",
        "description": "Hunt and the IMF pursue a dangerous AI called the Entity that has infiltrated global intelligence, racing to stop it from changing the world forever.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/5eN3QTjaBbBGoHHa0sSfuItvhm8.jpg",
        "trailer_url": "https://youtu.be/fsQgc9pCyDU?si=Ld0d_7R_aObXXjku",
    },
    {
        "title": "Wicked: For Good",
        "genre": "Romance",
        "status": "coming_soon",
        "description": "The second part of the two-part adaptation of the Broadway musical, continuing the story of Elphaba and Glinda.",
        "rating": "PG",
        "poster_url": "https://image.tmdb.org/t/p/original/jdd0Qv6V8AJ3V7Dr8aMIMUWxZ2c.jpg",
        "trailer_url": "https://youtu.be/R2Xubj7lazE?si=AVAvWMDsqJM4TYS-",
    },
]


result = movies_collection.insert_many(movies)
print(f"Seeded {len(result.inserted_ids)} movies")