import os
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

from app.security import hash_password

load_dotenv()

SEED_USER_PASSWORD = os.getenv("SEED_USER_PASSWORD", "ChangeMe123!")

uri = os.getenv("MONGO_URI")
db_name = os.getenv("MONGO_DB", "ces_db")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client[db_name]

collections = [
    "movies", "users", "bookings", "tickets", "shows",
    "showrooms", "theatres", "seats", "promotions",
    "ticket_prices", "addresses", "customer_preferences",
    "recommendations", "booking_history"
]
for col in collections:
    db[col].delete_many({})
print("Cleared all collections")


movies = db["movies"].insert_many([
    {
        # frontend existing
        "title": "Sinners",
        "genre": "Horror",
        "status": "currently_running",
        "description": "Trying to leave their troubled lives behind, twin brothers return to their hometown to start again, only to discover that an even greater evil is waiting to welcome them back.",
        "rating": "R",
        "poster_url": "https://image.tmdb.org/t/p/original/yqsCU5XOP2mkbFamzAqbqntmfav.jpg",
        "trailer_url": "https://youtu.be/bKGxHflevuk?si=WgulYGfvw29Ye3ku",
        # from class diagram 
        "category": "Horror",
        "cast": "Michael B. Jordan, Hailee Steinfeld",
        "director": "Ryan Coogler",
        "producer": "Zinzi Coogler",
        "synopsis": "Trying to leave their troubled lives behind, twin brothers return to their hometown to start again, only to discover that an even greater evil is waiting to welcome them back.",
        "ratingCode": "R",
        "releaseDate": "2025-04-18",
    },
    {
        "title": "F1: The Movie",
        "genre": "Action",
        "status": "currently_running",
        "description": "A Formula One driver comes out of retirement to mentor and team up with a younger driver.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/9PXZIUsSDh4alB80jheWX4fhZmy.jpg",
        "trailer_url": "https://youtu.be/8yh9BPUBbbQ?si=0tFiPZ4NeoOEFuWm",
        "category": "Action",
        "cast": "Brad Pitt, Damson Idris",
        "director": "Joseph Kosinski",
        "producer": "Jerry Bruckheimer",
        "synopsis": "A Formula One driver comes out of retirement to mentor and team up with a younger driver.",
        "ratingCode": "PG-13",
        "releaseDate": "2025-06-27",
    },
    {
        "title": "How to Train Your Dragon",
        "genre": "Animation",
        "status": "currently_running",
        "description": "The friendship between Hiccup, an inventive Viking, and Toothless, a Night Fury dragon, becomes the key to both species forging a new future together.",
        "rating": "PG",
        "poster_url": "https://image.tmdb.org/t/p/original/41dfWUWtg1kUZcJYe6Zk6ewxzMu.jpg",
        "trailer_url": "https://youtu.be/22w7z_lT6YM?si=2qU3DY6QQUMSHsJJ",
        "category": "Animation",
        "cast": "Mason Thames, Nico Parker",
        "director": "Dean DeBlois",
        "producer": "Dean DeBlois",
        "synopsis": "The friendship between Hiccup, an inventive Viking, and Toothless, a Night Fury dragon, becomes the key to both species forging a new future together.",
        "ratingCode": "PG",
        "releaseDate": "2025-06-13",
    },
    {
        "title": "Superman",
        "genre": "Action",
        "status": "currently_running",
        "description": "Superman must reconcile his Kryptonian heritage with his human upbringing as reporter Clark Kent, as the embodiment of truth, justice and the human way.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/oe5TVF6GQDESLsGiFrN6GyJEekh.jpg",
        "trailer_url": "https://youtu.be/Ox8ZLF6cGM0?si=7YW4c6u_V07Sa2cb",
        "category": "Action",
        "cast": "David Corenswet, Rachel Brosnahan",
        "director": "James Gunn",
        "producer": "Peter Safran",
        "synopsis": "Superman must reconcile his Kryptonian heritage with his human upbringing as reporter Clark Kent, as the embodiment of truth, justice and the human way.",
        "ratingCode": "PG-13",
        "releaseDate": "2025-07-11",
    },
    {
        "title": "Thunderbolts*",
        "genre": "Action",
        "status": "currently_running",
        "description": "After finding themselves ensnared in a death trap, an unconventional team of antiheroes must go on a dangerous mission that will force them to confront the darkest corners of their pasts.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/vnfgoohSwKNOcRfJOPULXTvX0cu.jpg",
        "trailer_url": "https://youtu.be/-sAOWhvheK8?si=9lhdWCMzz659h29X",
        "category": "Action",
        "cast": "Florence Pugh, Sebastian Stan",
        "director": "Jake Schreier",
        "producer": "Kevin Feige",
        "synopsis": "After finding themselves ensnared in a death trap, an unconventional team of antiheroes must go on a dangerous mission that will force them to confront the darkest corners of their pasts.",
        "ratingCode": "PG-13",
        "releaseDate": "2025-05-02",
    },
    {
        "title": "Avatar: Fire and Ash",
        "genre": "Sci-Fi",
        "status": "coming_soon",
        "description": "Jake and Neytiri's family grapples with grief, encountering a new aggressive Na'vi tribe as the conflict on Pandora escalates.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/5bxrxnRaxZooBAxgUVBZ13dpzC7.jpg",
        "trailer_url": "https://youtu.be/nb_fFj_0rq8?si=D5zuv2gfHGCbbVG_",
        "category": "Sci-Fi",
        "cast": "Sam Worthington, Zoe Saldana",
        "director": "James Cameron",
        "producer": "James Cameron",
        "synopsis": "Jake and Neytiri's family grapples with grief, encountering a new aggressive Na'vi tribe as the conflict on Pandora escalates.",
        "ratingCode": "PG-13",
        "releaseDate": "2025-12-19",
    },
    {
        "title": "One Battle After Another",
        "genre": "Drama",
        "status": "coming_soon",
        "description": "When their evil enemy resurfaces after 16 years, a group of ex-revolutionaries reunite to rescue the daughter of one of their own.",
        "rating": "R",
        "poster_url": "https://image.tmdb.org/t/p/original/lbBWwxBht4JFP5PsuJ5onpMqugW.jpg",
        "trailer_url": "https://youtu.be/feOQFKv2Lw4?si=oNAoex1YM--PF-m_",
        "category": "Drama",
        "cast": "Leonardo DiCaprio, Sean Penn",
        "director": "Paul Thomas Anderson",
        "producer": "Paul Thomas Anderson",
        "synopsis": "When their evil enemy resurfaces after 16 years, a group of ex-revolutionaries reunite to rescue the daughter of one of their own.",
        "ratingCode": "R",
        "releaseDate": "2025-09-26",
    },
    {
        "title": "Zootopia 2",
        "genre": "Animation",
        "status": "coming_soon",
        "description": "Brave rabbit cop Judy Hopps and her friend, the fox Nick Wilde, team up again to crack a new case, the most perilous and intricate of their careers.",
        "rating": "PG",
        "poster_url": "https://image.tmdb.org/t/p/original/bjUWGw0Ao0qVWxagN3VCwBJHVo6.jpg",
        "trailer_url": "https://youtu.be/BjkIOU5PhyQ?si=tRuhH-V8TBDD-ydX",
        "category": "Animation",
        "cast": "Ginnifer Goodwin, Jason Bateman",
        "director": "Jared Bush",
        "producer": "Clark Spencer",
        "synopsis": "Brave rabbit cop Judy Hopps and her friend, the fox Nick Wilde, team up again to crack a new case, the most perilous and intricate of their careers.",
        "ratingCode": "PG",
        "releaseDate": "2025-11-26",
    },
    {
        "title": "Mission: Impossible - The Final Reckoning",
        "genre": "Action",
        "status": "coming_soon",
        "description": "Hunt and the IMF pursue a dangerous AI called the Entity that has infiltrated global intelligence, racing to stop it from changing the world forever.",
        "rating": "PG-13",
        "poster_url": "https://image.tmdb.org/t/p/original/5eN3QTjaBbBGoHHa0sSfuItvhm8.jpg",
        "trailer_url": "https://youtu.be/fsQgc9pCyDU?si=Ld0d_7R_aObXXjku",
        "category": "Action",
        "cast": "Tom Cruise, Hayley Atwell",
        "director": "Christopher McQuarrie",
        "producer": "Tom Cruise",
        "synopsis": "Hunt and the IMF pursue a dangerous AI called the Entity that has infiltrated global intelligence, racing to stop it from changing the world forever.",
        "ratingCode": "PG-13",
        "releaseDate": "2025-05-23",
    },
    {
        "title": "Wicked: For Good",
        "genre": "Romance",
        "status": "coming_soon",
        "description": "The second part of the two-part adaptation of the Broadway musical, continuing the story of Elphaba and Glinda.",
        "rating": "PG",
        "poster_url": "https://image.tmdb.org/t/p/original/jdd0Qv6V8AJ3V7Dr8aMIMUWxZ2c.jpg",
        "trailer_url": "https://youtu.be/R2Xubj7lazE?si=AVAvWMDsqJM4TYS-",
        "category": "Romance",
        "cast": "Cynthia Erivo, Ariana Grande",
        "director": "Jon M. Chu",
        "producer": "Marc Platt",
        "synopsis": "The second part of the two-part adaptation of the Broadway musical, continuing the story of Elphaba and Glinda.",
        "ratingCode": "PG",
        "releaseDate": "2025-11-21",
    },
])
movie_ids = movies.inserted_ids
print(f"Seeded {len(movie_ids)} movies")

# Seed Adresses
addresses = db["addresses"].insert_many([
    {"street": "123 Main St", "city": "Athens", "state": "GA", "zipCode": "30601"},
    {"street": "456 Oak Ave", "city": "Atlanta", "state": "GA", "zipCode": "30301"},
    {"street": "789 Elm St", "city": "Kennesaw", "state": "GA", "zipCode": "30144"},
])
address_ids = addresses.inserted_ids
print(f"Seeded {len(address_ids)} addresses")

# Seed users
admin_password_hash = hash_password(os.getenv("ADMIN_SEED_PASSWORD", SEED_USER_PASSWORD))
customer_password_hash = hash_password(os.getenv("CUSTOMER_SEED_PASSWORD", SEED_USER_PASSWORD))

users = db["users"].insert_many([
    {
        "role": "admin",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@ces.com",
        "password": admin_password_hash,
    },
    {
        "role": "customer",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "password": customer_password_hash,
        "status": "ACTIVE",
        "mailingAddress": address_ids[0],
        "paymentCards": [],
        "favoriteMovies": [movie_ids[0], movie_ids[1]],
    },
    {
        "role": "customer",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com",
        "password": customer_password_hash,
        "status": "ACTIVE",
        "mailingAddress": address_ids[1],
        "paymentCards": [],
        "favoriteMovies": [movie_ids[2]],
    },
])
user_ids = users.inserted_ids
print(f"Seeded {len(user_ids)} users")

# Seed theatre
theatre = db["theatres"].insert_one({
    "name": "CES Cinema",
    "location": "123 Cinema Blvd, Athens, GA",
})
theatre_id = theatre.inserted_id

# Seed showrooms
showroom1 = db["showrooms"].insert_one({
    "theatreId": theatre_id,
    "name": "Screen 1",
    "numberOfSeats": 70,
})
showroom2 = db["showrooms"].insert_one({
    "theatreId": theatre_id,
    "name": "Screen 2",
    "numberOfSeats": 70,
})
print(f"Seeded 1 theatre & 2 showrooms")

seat_ids_1 = []
seat_ids_2 = []
for row in ["A", "B"]:
    for num in range(1, 4):
        seat = db["seats"].insert_one({
            "showroomId": showroom1.inserted_id,
            "seatNumber": str(num),
            "row": row,
        })
        seat_ids_1.append(seat.inserted_id)
        seat = db["seats"].insert_one({
            "showroomId": showroom2.inserted_id,
            "seatNumber": str(num),
            "row": row,
        })
        seat_ids_2.append(seat.inserted_id)
print(f"Seeded {len(seat_ids_1) + len(seat_ids_2)} seats")

# Seed shows
shows = db["shows"].insert_many([
    {
        "movieId": movie_ids[0],
        "showroomId": showroom1.inserted_id,
        "date": "2026-03-25",
        "time": "2:00 PM",
        "duration": 137,
    },
    {
        "movieId": movie_ids[0],
        "showroomId": showroom1.inserted_id,
        "date": "2026-03-25",
        "time": "5:00 PM",
        "duration": 137,
    },
    {
        "movieId": movie_ids[1],
        "showroomId": showroom2.inserted_id,
        "date": "2026-03-25",
        "time": "8:00 PM",
        "duration": 155,
    },
])
show_ids = shows.inserted_ids
print(f"Seeded {len(show_ids)} shows")

# Seed ticket prices
db["ticket_prices"].insert_many([
    {"ticketType": "ADULT", "price": 12.99},
    {"ticketType": "SENIOR", "price": 9.99},
    {"ticketType": "CHILD", "price": 7.99},
])
print(f"Seeded ticket prices")

# Seed promos
db["promotions"].insert_many([
    {
        "promoCode": "SUMMER25",
        "discount": 0.25,
        "startDate": "2026-06-01",
        "endDate": "2026-08-31",
    },
    {
        "promoCode": "WELCOME10",
        "discount": 0.10,
        "startDate": "2026-01-01",
        "endDate": "2026-12-31",
    },
])
print(f"Seeded promotions")

# Seed bookings
booking = db["bookings"].insert_one({
    "customerId": user_ids[1],
    "showId": show_ids[0],
    "bookingDate": "2026-03-20",
    "totalPrice": 25.98,
    "promoApplied": None,
    "paymentCard": None,
})
booking_id = booking.inserted_id

# Seed tickets
db["tickets"].insert_many([
    {
        "bookingId": booking_id,
        "type": "ADULT",
        "price": 12.99,
        "seatId": seat_ids_1[0],
    },
    {
        "bookingId": booking_id,
        "type": "ADULT",
        "price": 12.99,
        "seatId": seat_ids_1[1],
    },
])
print(f"Seeded 1 booking + 2 tickets")

# Seed customer prefs
db["customer_preferences"].insert_many([
    {
        "customerId": user_ids[1],
        "favoriteGenres": ["Horror", "Action"],
        "favoriteActors": ["Michael B. Jordan"],
    },
    {
        "customerId": user_ids[2],
        "favoriteGenres": ["Animation", "Romance"],
        "favoriteActors": ["Ariana Grande"],
    },
])
print(f"Seeded customer preferences")

# Seed booking hist
db["booking_history"].insert_many([
    {
        "customerId": user_ids[1],
        "totalBookings": 1,
        "lastBookingDate": "2026-03-20",
        "bookingIds": [booking_id],
    },
])
print(f"Seeded booking history")

# Seed recs
db["recommendations"].insert_many([
    {
        "customerId": user_ids[1],
        "movieId": movie_ids[0],
        "generatedDate": "2026-03-20",
        "score": 0.95,
    },
    {
        "customerId": user_ids[2],
        "movieId": movie_ids[7],
        "generatedDate": "2026-03-20",
        "score": 0.88,
    },
])
print(f"Seeded recommendations")

print("\n--Database seeded--")