const mongoose = require("mongoose");
const urlShortenerService = require("../services/urlShortener.service");
const { Url } = require("../models");

describe("URL Shortener Service", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Url.deleteMany({});
  });

  test("Should generate unique short codes", async () => {
    const url1 = await urlShortenerService.shortenWithRandomCode(
      "https://example.com/1",
    );
    const url2 = await urlShortenerService.shortenWithRandomCode(
      "https://example.com/2",
    );

    expect(url1.shortCode).not.toBe(url2.shortCode);
  });

  test("Should return same short code for same URL", async () => {
    const longUrl = "https://example.com/same-url";

    const url1 = await urlShortenerService.shortenWithHash(longUrl);
    const url2 = await urlShortenerService.shortenWithHash(longUrl);

    expect(url1.shortCode).toBe(url2.shortCode);
  });

  test("Should create custom alias", async () => {
    const customAlias = "my-custom-link";
    const result = await urlShortenerService.createWithCustomAlias(
      "https://example.com",
      customAlias,
    );

    expect(result.shortCode).toBe(customAlias);
  });

  test("Should not allow duplicate custom alias", async () => {
    const customAlias = "duplicate-alias";

    await urlShortenerService.createWithCustomAlias(
      "https://example.com/1",
      customAlias,
    );

    await expect(
      urlShortenerService.createWithCustomAlias(
        "https://example.com/2",
        customAlias,
      ),
    ).rejects.toThrow();
  });

  test("Should retrieve long URL from short code", async () => {
    const longUrl = "https://example.com/test-retrieve";
    const { shortCode } =
      await urlShortenerService.shortenWithRandomCode(longUrl);

    const retrievedUrl = await urlShortenerService.getLongUrl(shortCode);

    expect(retrievedUrl).toBe(longUrl);
  });
});
