import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { processEventAttendance } from "./attendance";

jest.mock("firebase-functions/logger", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

jest.mock("firebase-admin", () => {
    const originalAdmin = jest.requireActual("firebase-admin");
    const firestoreMock = jest.fn();

    Object.assign(firestoreMock, {
        Timestamp: originalAdmin.firestore.Timestamp,
    });

    return {
        ...originalAdmin,
        firestore: firestoreMock,
    };
});

describe("processEventAttendance", () => {
    const mockNow = Timestamp.fromDate(new Date("2025-03-01T10:00:00Z"));
    const oneHourFromNow = Timestamp.fromMillis(
        mockNow.toMillis() + 60 * 60 * 1000,
    );

    const mockFirstWhere = jest.fn();
    const mockSecondWhere = jest.fn();
    const mockGetQueryResult = jest.fn();
    const mockUserGet = jest.fn();

    const mockBatchUpdate = jest.fn();
    const mockBatchCommit = jest.fn();
    const mockBatchFactory = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
    }));

    const mockLogger = jest.requireMock("firebase-functions/logger");

    beforeEach(() => {
        jest.clearAllMocks();

        jest
            .spyOn(admin.firestore.Timestamp, "now")
            .mockReturnValue(mockNow);

        (admin.firestore as unknown as jest.Mock).mockReturnValue({
            collection: (name: string) => {
                if (name === "eventInstances") {
                    return { where: mockFirstWhere };
                }
                if (name === "users") {
                    return { doc: (_uid: string) => ({ get: mockUserGet }) };
                }
                throw new Error(`Unexpected collection: ${name}`);
            },
            batch: mockBatchFactory,
        });

        mockFirstWhere.mockReturnValue({ where: mockSecondWhere });
        mockSecondWhere.mockReturnValue({ get: mockGetQueryResult });
    });

    it("should update attendance when user has no existing attendance history", async () => {
        const mockEventDoc = {
            id: "event123",
            data: () => ({
                eventStartDateTime: oneHourFromNow,
                attendanceProcessed: false,
                participants: [{ uid: "user1", displayName: "User One" }],
                groupId: "group123",
                spots: 5,
                title: "Test Event",
            }),
            ref: { id: "event123" },
        };

        mockGetQueryResult.mockResolvedValue({
            empty: false,
            size: 1,
            forEach: (callback: any) => callback(mockEventDoc),
        });

        mockUserGet.mockResolvedValue({
            exists: true,
            id: "user1",
            data: () => ({
                attendanceHistory: {},
            }),
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.any(Object),
            { "attendanceHistory.group123": oneHourFromNow },
        );
        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "event123" }),
            { attendanceProcessed: true },
        );
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Scheduled attendance update for user"),
        );
    });

    it("should update attendance when new event is newer than existing attendance", async () => {
        const olderAttendance = Timestamp.fromMillis(
            mockNow.toMillis() - 24 * 60 * 60 * 1000, // 1 day ago
        );

        const mockEventDoc = {
            id: "event123",
            data: () => ({
                eventStartDateTime: oneHourFromNow,
                attendanceProcessed: false,
                participants: [{ uid: "user1", displayName: "User One" }],
                groupId: "group123",
                spots: 5,
                title: "Test Event",
            }),
            ref: { id: "event123" },
        };

        mockGetQueryResult.mockResolvedValue({
            empty: false,
            size: 1,
            forEach: (callback: any) => callback(mockEventDoc),
        });

        mockUserGet.mockResolvedValue({
            exists: true,
            id: "user1",
            data: () => ({
                attendanceHistory: {
                    group123: olderAttendance,
                },
            }),
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.any(Object),
            {
                "attendanceHistory.group123": oneHourFromNow,
            },
        );
        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "event123" }),
            {
                attendanceProcessed: true,
            },
        );
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Scheduled attendance update for user"),
        );
    });

    it("should NOT update attendance when existing attendance is newer", async () => {
        const newerAttendance = Timestamp.fromMillis(
            oneHourFromNow.toMillis() + 60 * 60 * 1000, // 1 hour after event
        );

        const mockEventDoc = {
            id: "event123",
            data: () => ({
                eventStartDateTime: oneHourFromNow,
                attendanceProcessed: false,
                participants: [{ uid: "user1", displayName: "User One" }],
                groupId: "group123",
                spots: 5,
                title: "Test Event",
            }),
            ref: { id: "event123" },
        };

        mockGetQueryResult.mockResolvedValue({
            empty: false,
            size: 1,
            forEach: (callback: any) => callback(mockEventDoc),
        });

        mockUserGet.mockResolvedValue({
            exists: true,
            id: "user1",
            data: () => ({
                attendanceHistory: {
                    group123: newerAttendance,
                },
            }),
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "event123" }),
            {
                attendanceProcessed: true,
            },
        );
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Skipping attendance update for user"),
        );
    });

    it("should NOT update attendance when existing attendance is exactly the same timestamp", async () => {
        const sameAttendance = oneHourFromNow; // Same as event start time

        const mockEventDoc = {
            id: "event123",
            data: () => ({
                eventStartDateTime: oneHourFromNow,
                attendanceProcessed: false,
                participants: [{ uid: "user1", displayName: "User One" }],
                groupId: "group123",
                spots: 5,
                title: "Test Event",
            }),
            ref: { id: "event123" },
        };

        mockGetQueryResult.mockResolvedValue({
            empty: false,
            size: 1,
            forEach: (callback: any) => callback(mockEventDoc),
        });

        mockUserGet.mockResolvedValue({
            exists: true,
            id: "user1",
            data: () => ({
                attendanceHistory: {
                    group123: sameAttendance,
                },
            }),
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "event123" }),
            {
                attendanceProcessed: true,
            },
        );
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Skipping attendance update for user"),
        );
    });

    it("should mark event as processed if missing required fields", async () => {
        const mockEventDoc = {
            id: "event456",
            data: () => ({
                eventStartDateTime: oneHourFromNow,
                attendanceProcessed: false,
                title: "Incomplete Event",
            }),
            ref: { id: "event456" },
        };

        mockGetQueryResult.mockResolvedValue({
            empty: false,
            size: 1,
            forEach: (callback: any) => callback(mockEventDoc),
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "event456" }),
            {
                attendanceProcessed: true,
            },
        );
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining(
                "Event instance event456 is missing required fields",
            ),
        );
        expect(mockLogger.info).not.toHaveBeenCalledWith(
            expect.stringContaining("Scheduled attendance update for user"),
        );
    });

    it("should do nothing if no upcoming event instances are found", async () => {
        mockGetQueryResult.mockResolvedValue({
            empty: true,
            size: 0,
            forEach: () => { },
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).not.toHaveBeenCalled();
        expect(mockBatchCommit).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            "No upcoming event instances found in the time window",
        );
    });

    it("should not commit batch if no operations were performed", async () => {
        const mockEventDoc = {
            id: "event123",
            data: () => ({
                eventStartDateTime: oneHourFromNow,
                attendanceProcessed: true, // Already processed
                participants: [{ uid: "user1", displayName: "User One" }],
                groupId: "group123",
                spots: 5,
                title: "Test Event",
            }),
            ref: { id: "event123" },
        };

        mockGetQueryResult.mockResolvedValue({
            empty: false,
            size: 1,
            forEach: (callback: any) => callback(mockEventDoc),
        });

        await processEventAttendance(admin.firestore(), mockLogger);

        expect(mockBatchUpdate).not.toHaveBeenCalled();
        expect(mockBatchCommit).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            "All event instances in the time window were already processed",
        );
    });
});
