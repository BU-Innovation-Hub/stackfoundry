/**
 * Unit tests for course.service enrollment counts
 * Verifies the enrolledCount is computed from real Enrollment data,
 * never fabricated.
 */

jest.mock("../models/course.model");
jest.mock("../models/level.model");
jest.mock("../models/enrollment.model");

import Course from "../models/course.model";
import Enrollment from "../models/enrollment.model";
import { getCourses, getCourseById } from "../services/course.service";

const mockedCourse = Course as jest.Mocked<typeof Course>;
const mockedEnrollment = Enrollment as jest.Mocked<typeof Enrollment>;

describe("getCourses enrollment counts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("attaches precise per-course enrollment counts from the Enrollment collection", async () => {
    const courses = [
      { _id: { toString: () => "c1" }, title: "React", createdAt: new Date() },
      { _id: { toString: () => "c2" }, title: "Python", createdAt: new Date() },
      { _id: { toString: () => "c3" }, title: "Nobody enrolled", createdAt: new Date() },
    ];
    const populate = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(courses),
    });
    const sort = jest.fn().mockReturnValue({ populate });
    (mockedCourse.find as jest.Mock).mockReturnValue({ sort });

    (mockedEnrollment.aggregate as jest.Mock).mockResolvedValue([
      { _id: { toString: () => "c1" }, count: 7 },
      { _id: { toString: () => "c2" }, count: 3 },
    ]);

    const result = await getCourses();

    expect(result).toHaveLength(3);
    expect(result[0].enrolledCount).toBe(7);
    expect(result[1].enrolledCount).toBe(3);
    // Course with zero enrollments reports exactly 0
    expect(result[2].enrolledCount).toBe(0);
  });

  it("reports 0 for every course when no enrollments exist", async () => {
    const courses = [{ _id: { toString: () => "c1" }, title: "Empty" }];
    const populate = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(courses) });
    const sort = jest.fn().mockReturnValue({ populate });
    (mockedCourse.find as jest.Mock).mockReturnValue({ sort });
    (mockedEnrollment.aggregate as jest.Mock).mockResolvedValue([]);

    const result = await getCourses();
    expect(result[0].enrolledCount).toBe(0);
  });
});

describe("getCourseById enrollment count", () => {
  beforeEach(() => jest.clearAllMocks());

  const VALID_ID = "64b7f5a2c9d1e2f3a4b5c6d7";

  it("attaches the precise count for a single course", async () => {
    const courseDoc = { _id: { toString: () => VALID_ID }, title: "React" };
    const populate = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(courseDoc) });
    (mockedCourse.findById as jest.Mock).mockReturnValue({ populate });
    (mockedEnrollment.aggregate as jest.Mock).mockResolvedValue([
      { _id: { toString: () => VALID_ID }, count: 12 },
    ]);

    const result = await getCourseById(VALID_ID);
    expect(result.enrolledCount).toBe(12);
  });

  it("throws 404 when the course does not exist", async () => {
    const populate = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    (mockedCourse.findById as jest.Mock).mockReturnValue({ populate });

    await expect(getCourseById(VALID_ID)).rejects.toMatchObject({ statusCode: 404 });
  });
});
