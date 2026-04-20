const STATIC_USERS = [
  {
    email: "admin@test.com",
    password: "123456",
    role: "admin",
    fullName: "Admin Operator",
  },
  {
    email: "user@test.com",
    password: "123456",
    role: "user",
    fullName: "User Analyst",
  },
];

export async function authenticateStaticUser(email, password) {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  const user = STATIC_USERS.find(
    (entry) => entry.email === email.trim().toLowerCase() && entry.password === password
  );
  if (!user) return null;
  return {
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };
}
