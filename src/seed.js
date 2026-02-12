/**
 * Seed script — populates the database with example data.
 * Run with:  npm run seed
 */
const { getDb, closeDb } = require("./db");
const IssuerModel = require("./models/issuer");
const YouthModel = require("./models/youth");
const CredentialDefinitionModel = require("./models/credentialDefinition");
const CredentialModel = require("./models/credential");

// Force DB init
getDb();

console.log("Seeding database...\n");

// --- Issuers ---
const school = IssuerModel.create({
  name: "Lincoln High School",
  type: "school",
  contact_email: "admin@lincolnhs.edu",
  address: "100 Main St, Anytown, USA",
});
const nonprofit = IssuerModel.create({
  name: "Code4Youth",
  type: "nonprofit",
  contact_email: "hello@code4youth.org",
  contact_phone: "555-0100",
});
const recCenter = IssuerModel.create({
  name: "Riverside Recreation Center",
  type: "rec_center",
  contact_email: "info@riversiderec.gov",
});
const workforce = IssuerModel.create({
  name: "CityWorks Summer Jobs",
  type: "workforce_program",
  contact_email: "jobs@cityworks.gov",
});

// Approve all issuers
IssuerModel.approve(school.id, "city_admin");
IssuerModel.approve(nonprofit.id, "city_admin");
IssuerModel.approve(recCenter.id, "city_admin");
IssuerModel.approve(workforce.id, "city_admin");

console.log("Created 4 issuers (all approved)");

// --- Youth ---
const maria = YouthModel.create({
  first_name: "Maria",
  last_name: "Garcia",
  date_of_birth: "2008-03-15",
  email: "maria.g@email.com",
  city: "Anytown",
});
const jamal = YouthModel.create({
  first_name: "Jamal",
  last_name: "Williams",
  date_of_birth: "2009-07-22",
  email: "jamal.w@email.com",
  city: "Anytown",
});
const aisha = YouthModel.create({
  first_name: "Aisha",
  last_name: "Johnson",
  date_of_birth: "2008-11-01",
  city: "Anytown",
});

console.log("Created 3 youth profiles");

// --- Credential Definitions ---
const webDev = CredentialDefinitionModel.create({
  issuer_id: nonprofit.id,
  name: "Web Development Fundamentals",
  category: "skill",
  description: "Completed 40-hour intro course in HTML, CSS, and JavaScript",
  requirements: "Attend all sessions, complete final project",
  hours_required: 40,
});
const cpr = CredentialDefinitionModel.create({
  issuer_id: recCenter.id,
  name: "CPR & First Aid Certified",
  category: "certification",
  description: "American Red Cross CPR/First Aid certification",
  requirements: "Pass written and practical exam",
  hours_required: 8,
});
const summerJob = CredentialDefinitionModel.create({
  issuer_id: workforce.id,
  name: "Summer Employment — 120 Hours",
  category: "hours",
  description: "Successfully completed 120+ hours of supervised summer employment",
  hours_required: 120,
});
const digitalLit = CredentialDefinitionModel.create({
  issuer_id: school.id,
  name: "Digital Literacy Badge",
  category: "badge",
  description: "Demonstrated proficiency in digital tools, online safety, and information literacy",
  requirements: "Complete portfolio and pass assessment",
  hours_required: 20,
});
const leadership = CredentialDefinitionModel.create({
  issuer_id: nonprofit.id,
  name: "Youth Leadership Program",
  category: "completion",
  description: "Completed 10-week youth leadership and public speaking program",
  requirements: "Attend 8 of 10 sessions, deliver final presentation",
  hours_required: 30,
});

console.log("Created 5 credential definitions");

// --- Issue Credentials ---
const c1 = CredentialModel.issue({
  credential_def_id: webDev.id,
  issuer_id: nonprofit.id,
  youth_id: maria.id,
  notes: "Outstanding final project — built a community resource finder app",
});
const c2 = CredentialModel.issue({
  credential_def_id: cpr.id,
  issuer_id: recCenter.id,
  youth_id: maria.id,
  expires_at: "2027-06-01",
});
const c3 = CredentialModel.issue({
  credential_def_id: summerJob.id,
  issuer_id: workforce.id,
  youth_id: jamal.id,
  evidence_url: "https://cityworks.gov/verify/jamal-2025",
  notes: "Worked at Parks Department — excellent reviews",
});
const c4 = CredentialModel.issue({
  credential_def_id: digitalLit.id,
  issuer_id: school.id,
  youth_id: jamal.id,
});
const c5 = CredentialModel.issue({
  credential_def_id: leadership.id,
  issuer_id: nonprofit.id,
  youth_id: aisha.id,
  notes: "Selected as cohort speaker for graduation ceremony",
});
const c6 = CredentialModel.issue({
  credential_def_id: webDev.id,
  issuer_id: nonprofit.id,
  youth_id: aisha.id,
});

console.log("Issued 6 credentials\n");

// --- Print summary ---
console.log("=== Verification Codes ===");
console.log(`Maria — Web Dev:     ${c1.verification_code}`);
console.log(`Maria — CPR:         ${c2.verification_code}`);
console.log(`Jamal — Summer Job:  ${c3.verification_code}`);
console.log(`Jamal — Digital Lit: ${c4.verification_code}`);
console.log(`Aisha — Leadership:  ${c5.verification_code}`);
console.log(`Aisha — Web Dev:     ${c6.verification_code}`);
console.log(`\nUse: GET /api/verify/<CODE> to verify any credential`);

closeDb();
console.log("\nDone! Database seeded at credentials.db");
