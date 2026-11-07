import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Helper: create a future date N days from now at a given hour
function daysFromNow(days: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("Demo1234", 10);

  // Wipe existing data (order matters)
  await db.participation.deleteMany();
  await db.event.deleteMany();
  await db.user.deleteMany();

  const users = await Promise.all([
    db.user.create({
      data: {
        name: "Rafi Ahmed",
        email: "demo@volunify.test",
        photoURL: "https://i.pravatar.cc/150?u=rafi",
        passwordHash,
      },
    }),
    db.user.create({
      data: {
        name: "Nusrat Jahan",
        email: "nusrat@volunify.test",
        photoURL: "https://i.pravatar.cc/150?u=nusrat",
        passwordHash,
      },
    }),
    db.user.create({
      data: {
        name: "Tanvir Hasan",
        email: "tanvir@volunify.test",
        photoURL: "https://i.pravatar.cc/150?u=tanvir",
        passwordHash,
      },
    }),
  ]);

  const events = await Promise.all([
    db.event.create({
      data: {
        title: "Winter Clothes Distribution – Mirpur 10, Dhaka",
        description:
          "Join us as we distribute warm winter clothes to underprivileged families and day laborers around Mirpur 10 roundabout. Volunteers will help sort garments, manage distribution lines, and document families who need follow-up support. Warm hearts make warm winters — bring your gloves and your smile!",
        eventType: "Clothing Drive",
        thumbnailUrl: "/images/events/winter-clothes.jpg",
        location: "Mirpur 10 Roundabout, Dhaka",
        eventDate: daysFromNow(3, 9),
        creatorEmail: users[0].email,
      },
    }),
    db.event.create({
      data: {
        title: "Blanket Distribution for the Needy – Mohammadpur",
        description:
          "Cold nights are hardest on those who sleep outdoors. We are handing out 200+ blankets to street dwellers, rickshaw pullers, and elderly residents of Mohammadpur. Volunteers will assist with packing, carrying, and peaceful crowd coordination. Every blanket is a life shield this winter.",
        eventType: "Donation",
        thumbnailUrl: "/images/events/blanket.jpg",
        location: "Mohammadpur Town Hall, Dhaka",
        eventDate: daysFromNow(6, 15),
        creatorEmail: users[1].email,
      },
    }),
    db.event.create({
      data: {
        title: "Tree Plantation Drive – Ramna Park",
        description:
          "Help us green the city! We will plant 150 saplings of mango, neem, and mahogany along the park's western trail. Bring reusable water bottles — gloves, saplings, and planting tools will be provided. A short workshop on sapling care closes the day.",
        eventType: "Plantation",
        thumbnailUrl: "/images/events/plantation.jpg",
        location: "Ramna Park, Dhaka",
        eventDate: daysFromNow(9, 8),
        creatorEmail: users[0].email,
      },
    }),
    db.event.create({
      data: {
        title: "Lakeside Cleanup Morning – Dhanmondi Lake",
        description:
          "Our beloved Dhanmondi Lake deserves better. Join a 3-hour cleanup covering the walking trail and boat ghat areas. We will separate recyclables, log litter data for the city corporation, and finish with breakfast for all volunteers. Trash bags and tongs provided.",
        eventType: "Cleanup",
        thumbnailUrl: "/images/events/cleanup.jpg",
        location: "Dhanmondi Lake, Dhaka",
        eventDate: daysFromNow(12, 7),
        creatorEmail: users[2].email,
      },
    }),
    db.event.create({
      data: {
        title: "Community Food Share – Kawran Bazar",
        description:
          "Fresh produce rescued from Kawran Bazar wholesale market will be packed into family meal kits and distributed to nearby slum communities. Volunteers sort vegetables, pack boxes, and help carry kits to distribution points. Zero food waste, full stomachs.",
        eventType: "Food Distribution",
        thumbnailUrl: "/images/events/food.jpg",
        location: "Kawran Bazar, Dhaka",
        eventDate: daysFromNow(16, 11),
        creatorEmail: users[1].email,
      },
    }),
    db.event.create({
      data: {
        title: "Blood Donation Camp – Dhaka University",
        description:
          "One bag of blood can save up to three lives. We are hosting a blood donation camp with Quantum Foundation's medical team. Donors receive free health screening and refreshments; volunteers help with registration, donor care, and crowd flow.",
        eventType: "Blood Drive",
        thumbnailUrl: "/images/events/blood.jpg",
        location: "TSC, University of Dhaka",
        eventDate: daysFromNow(20, 10),
        creatorEmail: users[2].email,
      },
    }),
    db.event.create({
      data: {
        title: "Books for Bright Futures – Book Drive",
        description:
          "Donate or help distribute new and gently-used textbooks, storybooks, and stationery to students of government primary schools. Volunteers will categorize books by grade level, wrap gift packs, and read stories aloud to the kids. Literacy lights the way out of poverty.",
        eventType: "Education",
        thumbnailUrl: "/images/events/education.jpg",
        location: "Government Primary School, Mohammadpur",
        eventDate: daysFromNow(24, 9),
        creatorEmail: users[0].email,
      },
    }),
    db.event.create({
      data: {
        title: "Say No to Plastic – Awareness Rally",
        description:
          "A colorful, family-friendly awareness march from Gulshan Circle 2 to Gulshan Lake Park demanding reduced single-use plastic. We will hand out cloth bags, paint reusable banners, and collect plastic litter along the route. Bring drums, placards, and positive energy!",
        eventType: "Awareness Campaign",
        thumbnailUrl: "/images/events/awareness.jpg",
        location: "Gulshan Circle 2, Dhaka",
        eventDate: daysFromNow(28, 8),
        creatorEmail: users[1].email,
      },
    }),
    db.event.create({
      data: {
        title: "Free Health Checkup Camp – Kamrangirchar",
        description:
          "Doctors and volunteers will provide free blood pressure, blood sugar, and basic health consultations for residents of Kamrangirchar, one of Dhaka's most underserved neighborhoods. Medicine samples and health cards will be distributed; volunteers manage patient flow and records.",
        eventType: "Health Camp",
        thumbnailUrl: "/images/events/health.jpg",
        location: "Kamrangirchar Community Center, Dhaka",
        eventDate: daysFromNow(33, 10),
        creatorEmail: users[2].email,
      },
    }),
    db.event.create({
      data: {
        title: "Old Dhaka Heritage Street Cleanup",
        description:
          "Celebrate the heritage of Old Dhaka by cleaning the historic streets around Ahsan Manzil and Shankhari Bazar. We will sweep, remove wall posters, repaint heritage markers, and photograph the transformation. Ends with a heritage walk for all volunteers.",
        eventType: "Cleanup",
        thumbnailUrl: "/images/events/heritage-cleanup.jpg",
        location: "Ahsan Manzil Area, Old Dhaka",
        eventDate: daysFromNow(38, 7),
        creatorEmail: users[0].email,
      },
    }),
  ]);

  // Demo user joins 3 events
  await Promise.all([
    db.participation.create({
      data: { eventId: events[1].id, userEmail: users[0].email },
    }),
    db.participation.create({
      data: { eventId: events[3].id, userEmail: users[0].email },
    }),
    db.participation.create({
      data: { eventId: events[5].id, userEmail: users[0].email },
    }),
  ]);
  await db.participation.create({
    data: { eventId: events[0].id, userEmail: users[1].email },
  });

  console.log(`✅ Seeded ${users.length} users, ${events.length} events, 4 participations`);
  console.log("   Demo login → demo@volunify.test / Demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
