const mongoose = require("mongoose");
const Url = require("../models/Url.model");
const User = require("../models/User.model");

describe("URL Model Test", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await Url.deleteMany({});
    await User.deleteMany({});
  });

  test("Should create a valid URL", async () => {
    const urlData = {
      shortCode: "test123",
      longUrl: "https://example.com/very/long/url",
    };

    const url = await Url.create(urlData);

    expect(url.shortCode).toBe(urlData.shortCode);
    expect(url.longUrl).toBe(urlData.longUrl);
    expect(url.clicks).toBe(0);
    expect(url.status).toBe("active");
  });

  test("Should not create duplicate shortCode", async () => {
    await Url.create({
      shortCode: "test123",
      longUrl: "https://example.com/1",
    });

    // This should throw an error
    await expect(
      Url.create({
        shortCode: "test123",
        longUrl: "https://example.com/2",
      }),
    ).rejects.toThrow();
  });

  test("Should increment clicks", async () => {
    const url = await Url.create({
      shortCode: "test123",
      longUrl: "https://example.com",
    });

    await url.incrementClicks();
    const updatedUrl = await Url.findOne({ shortCode: "test123" });

    expect(updatedUrl.clicks).toBe(1);
  });
});
