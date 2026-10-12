import { loadBootstrapConfig, requireInitialPassword } from "../config/bootstrap";
import { loadEnv } from "../config/env";

const config = { MONGO_URI: "mongodb+srv://user:secret@cluster.example/innovation_hub?retryWrites=true&w=majority", ADMIN_EMAIL: "ADMIN@BOTHOUNIVERSITY.COM" };

it("requires an explicit target and normalizes the admin email without requiring a password on reruns", () => {
  expect(loadBootstrapConfig(config)).toEqual({ mongoUri: config.MONGO_URI, adminEmail: "admin@bothouniversity.com", adminPassword: undefined });
  expect(loadBootstrapConfig({ ...config, MONGO_URI: "mongodb://host1:27017,host2:27017/innovation_hub?replicaSet=rs0" }).mongoUri).toContain("host2");
});

it.each([undefined, "", "mongodb://localhost", "mongodb://localhost/", "mongodb+srv://cluster.example/?retryWrites=true", "mongodb://localhost/admin", "mongodb://localhost/local", "mongodb://localhost/config", "mongodb://localhost/%61dmin", "mongodb://localhost/%XX", "mongodb://localhost/my%2Fdb", "https://localhost/app"])("rejects unsafe or missing database target %s", uri => {
  expect(() => loadBootstrapConfig({ ...config, MONGO_URI: uri })).toThrow("MONGO_URI");
});

it.each([undefined, "", "admin@gmail.com", "user@bothouniversity.com.attacker.com"])("rejects invalid administrator email %s", email => {
  expect(() => loadBootstrapConfig({ ...config, ADMIN_EMAIL: email })).toThrow("ADMIN_EMAIL");
});

it.each([undefined, "", "Admin@123456", "abcdefghijklmnop", "ABCDEFGHIJKLMNOP1", "Ab1" + "a".repeat(70), "Ab1" + "é".repeat(35)])("rejects missing, weak, or bcrypt-truncated initial passwords", password => {
  expect(() => requireInitialPassword(password)).toThrow("ADMIN_PASSWORD");
});

it("preserves significant password whitespace and permits the bcrypt byte limit", () => {
  const password = " Ab1" + "x".repeat(67) + " ";
  expect(requireInitialPassword(password)).toBe(password);
});

it("allows the production API to start without bootstrap credentials", () => {
  const previous = process.env;
  try {
    process.env = {
      NODE_ENV: "production", MONGO_URI: config.MONGO_URI,
      JWT_ACCESS_SECRET: "test-access", JWT_REFRESH_SECRET: "test-refresh",
      EMAIL_SMTP_HOST: "smtp.example.com", EMAIL_SMTP_USER: "test", EMAIL_SMTP_PASS: "test",
      EMAIL_FROM: "noreply@bothouniversity.com", CLIENT_URL: "https://hub.example.com",
    };
    const env = loadEnv();
    expect(env.NODE_ENV).toBe("production");
    expect(env).not.toHaveProperty("ADMIN_PASSWORD");
    expect(env).not.toHaveProperty("ADMIN_EMAIL");
  } finally { process.env = previous; }
});
