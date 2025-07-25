import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { basicSorting } from './basic_sorting';
import { Participant } from "../../../../types";

jest.mock("firebase-admin", () => {
    const original = jest.requireActual("firebase-admin");
    return {
        ...original,
        firestore: jest.fn(),
    };
});

describe("sortParticipantsAfterListReveal", () => {
    const mockNow = Timestamp.fromDate(new Date("2025-03-01T00:00:00Z"));

    const mockEventInstancesCollection = jest.fn();
    const mockListRevealDateQuery = jest.fn();
    const mockParticipantsProcessedQuery = jest.fn();
    const mockGetQueryResult = jest.fn();

    beforeEach(() => {
        jest.spyOn(Timestamp, "now").mockReturnValue(mockNow);

        (admin.firestore as unknown as jest.Mock).mockReturnValue({
            collection: mockEventInstancesCollection,
        });

        mockEventInstancesCollection.mockReturnValue({
            where: mockListRevealDateQuery,
        });

        mockListRevealDateQuery.mockReturnValue({
            where: mockParticipantsProcessedQuery,
        });

        mockParticipantsProcessedQuery.mockReturnValue({
            get: mockGetQueryResult,
        });
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe("when no participants are in the event", () => {
        it("queries with correct filters and updates document with empty participants", async () => {
            const mockDoc = {
                id: "mockInstance",
                data: () => ({
                    listRevealDateTime: mockNow,
                    participantsListProcessed: false,
                    participants: [],
                    eventId: "event123",
                }),
                ref: {
                    update: jest.fn(),
                },
            };

            mockGetQueryResult.mockResolvedValue({ docs: [mockDoc] });

            await basicSorting(mockNow);

            expect(mockEventInstancesCollection).toHaveBeenCalledWith("eventInstances");
            expect(mockListRevealDateQuery).toHaveBeenCalledWith("listRevealDateTime", "<=", mockNow);
            expect(mockParticipantsProcessedQuery).toHaveBeenCalledWith("participantsListProcessed", "!=", true);

            expect(mockEventInstancesCollection).toHaveBeenCalledTimes(1);

            expect(mockDoc.ref.update).toHaveBeenCalledTimes(1);
            expect(mockDoc.ref.update).toHaveBeenCalledWith({
                participants: [],
                participantsListProcessed: true,
            });
        });
    });

    describe("when event has 3 participants: 1 organizer and 2 non-organizers with different last attendance", () => {
        it("sorts participants with organizer first and then by last attendance date", async () => {
            const mockParticipants: Participant[] = [
                {
                    uid: "uid-organizer",
                    displayName: "Organizer User",
                    photoURL: "url1",
                    isOrganizer: true,
                    registeredAt: mockNow as any,
                },
                {
                    uid: "uid-nonorg-with-attendance",
                    displayName: "Non Organizer With Attendance",
                    photoURL: "url2",
                    isOrganizer: false,
                    registeredAt: mockNow as any,
                },
                {
                    uid: "uid-nonorg-no-attendance",
                    displayName: "Non Organizer No Attendance",
                    photoURL: "url3",
                    isOrganizer: false,
                    registeredAt: mockNow as any,
                },
            ];

            const mockDoc = {
                id: "mockInstance",
                data: () => ({
                    listRevealDateTime: mockNow,
                    participantsListProcessed: false,
                    participants: mockParticipants,
                    eventId: "event123",
                }),
                ref: {
                    update: jest.fn(),
                },
            };

            const mockUserDocs = [
                { data: () => ({ attendanceHistory: {} }) },
                {
                    data: () => ({
                        attendanceHistory: {
                            event123: Timestamp.fromDate(new Date("2024-12-01T00:00:00Z")),
                        },
                    })
                },
                { data: () => ({ attendanceHistory: {} }) },
            ];

            mockGetQueryResult.mockResolvedValue({ docs: [mockDoc] });

            const mockUsersCollection = jest.fn();
            const mockUserDoc = jest.fn();

            mockUserDoc.mockImplementation(() => Promise.resolve(mockUserDocs.shift()!));
            mockUsersCollection.mockImplementation(() => ({ doc: () => ({ get: mockUserDoc }) }));

            mockEventInstancesCollection.mockReturnValue({
                where: mockListRevealDateQuery,
            });

            (admin.firestore as unknown as jest.Mock).mockReturnValue({
                collection: (name: string) => {
                    if (name === "eventInstances") {
                        return {
                            where: mockListRevealDateQuery,
                        };
                    }
                    if (name === "users") {
                        return mockUsersCollection();
                    }
                    throw new Error(`Unexpected collection query: ${name}`);
                },
            });

            mockListRevealDateQuery.mockReturnValue({
                where: mockParticipantsProcessedQuery,
            });

            mockParticipantsProcessedQuery.mockReturnValue({
                get: mockGetQueryResult,
            });

            await basicSorting(mockNow);

            expect(mockDoc.ref.update).toHaveBeenCalledTimes(1);

            const updatedParticipants = mockDoc.ref.update.mock.calls[0][0].participants as (Participant & { isLate: boolean; lastParticipation?: Timestamp })[];

            expect(updatedParticipants[0].uid).toBe("uid-organizer");
            expect(updatedParticipants[0].isOrganizer).toBe(true);

            expect(updatedParticipants[1].uid).toBe("uid-nonorg-no-attendance");
            expect(updatedParticipants[2].uid).toBe("uid-nonorg-with-attendance");
        });
    });

    describe("when two non-organizers both have no attendance history", () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        const mockParticipants: Participant[] = [
            {
                uid: "uid-nonorg-no-attendance-1",
                displayName: "Non Organizer No Attendance 1",
                photoURL: "url1",
                isOrganizer: false,
                registeredAt: mockNow as any,
            },
            {
                uid: "uid-nonorg-no-attendance-2",
                displayName: "Non Organizer No Attendance 2",
                photoURL: "url2",
                isOrganizer: false,
                registeredAt: mockNow as any,
            },
        ];

        const mockDoc = {
            id: "mockInstance",
            data: () => ({
                listRevealDateTime: mockNow,
                participantsListProcessed: false,
                participants: mockParticipants,
                eventId: "event123",
            }),
            ref: {
                update: jest.fn(),
            },
        };

        const mockUserDocs = [
            { data: () => ({ attendanceHistory: {} }) },
            { data: () => ({ attendanceHistory: {} }) },
        ];

        const mockUsersCollection = jest.fn();
        const mockUserDoc = jest.fn();

        beforeEach(() => {
            mockGetQueryResult.mockResolvedValue({ docs: [mockDoc] });

            mockUserDoc.mockImplementation(() => Promise.resolve(mockUserDocs.shift()!));
            mockUsersCollection.mockImplementation(() => ({ doc: () => ({ get: mockUserDoc }) }));

            mockEventInstancesCollection.mockReturnValue({
                where: mockListRevealDateQuery,
            });

            (admin.firestore as unknown as jest.Mock).mockReturnValue({
                collection: (name: string) => {
                    if (name === "eventInstances") {
                        return {
                            where: mockListRevealDateQuery,
                        };
                    }
                    if (name === "users") {
                        return mockUsersCollection();
                    }
                    throw new Error(`Unexpected collection query: ${name}`);
                },
            });

            mockListRevealDateQuery.mockReturnValue({
                where: mockParticipantsProcessedQuery,
            });

            mockParticipantsProcessedQuery.mockReturnValue({
                get: mockGetQueryResult,
            });

            mockDoc.ref.update.mockClear();
        });

        it("keeps order the same when Math.random returns greater than 0.5", async () => {
            jest.spyOn(Math, "random").mockReturnValue(0.6);

            await basicSorting(mockNow);

            const updatedParticipants = mockDoc.ref.update.mock.calls[0][0].participants;

            expect(updatedParticipants.length).toBe(2);
            expect(updatedParticipants[0].uid).toBe("uid-nonorg-no-attendance-1");
            expect(updatedParticipants[1].uid).toBe("uid-nonorg-no-attendance-2");
        });
    });

    describe("when two event instances are returned, each with 1 organizer and 1 non-organizer from different events", () => {
        const mockParticipantsEvent1: Participant[] = [
            {
                uid: "uid-org-event1",
                displayName: "Organizer Event 1",
                photoURL: "url1",
                isOrganizer: true,
                registeredAt: mockNow as any,
            },
            {
                uid: "uid-nonorg-event1",
                displayName: "Non Organizer Event 1",
                photoURL: "url2",
                isOrganizer: false,
                registeredAt: mockNow as any,
            },
        ];

        const mockParticipantsEvent2: Participant[] = [
            {
                uid: "uid-org-event2",
                displayName: "Organizer Event 2",
                photoURL: "url3",
                isOrganizer: true,
                registeredAt: mockNow as any,
            },
            {
                uid: "uid-nonorg-event2",
                displayName: "Non Organizer Event 2",
                photoURL: "url4",
                isOrganizer: false,
                registeredAt: mockNow as any,
            },
        ];

        const mockDocEvent1 = {
            id: "mockInstanceEvent1",
            data: () => ({
                listRevealDateTime: mockNow,
                participantsListProcessed: false,
                participants: mockParticipantsEvent1,
                eventId: "event1",
            }),
            ref: {
                update: jest.fn(),
            },
        };

        const mockDocEvent2 = {
            id: "mockInstanceEvent2",
            data: () => ({
                listRevealDateTime: mockNow,
                participantsListProcessed: false,
                participants: mockParticipantsEvent2,
                eventId: "event2",
            }),
            ref: {
                update: jest.fn(),
            },
        };

        const mockUserDocsEvent1 = [
            { data: () => ({ attendanceHistory: {} }) },
            { data: () => ({ attendanceHistory: {} }) },
        ];

        const mockUserDocsEvent2 = [
            { data: () => ({ attendanceHistory: {} }) },
            { data: () => ({ attendanceHistory: {} }) },
        ];

        beforeEach(() => {
            mockGetQueryResult.mockResolvedValue({ docs: [mockDocEvent1, mockDocEvent2] });

            const allMockUserDocs = [...mockUserDocsEvent1, ...mockUserDocsEvent2];
            const mockUsersCollection = jest.fn();
            const mockUserDoc = jest.fn();

            mockUserDoc.mockImplementation(() => Promise.resolve(allMockUserDocs.shift()!));
            mockUsersCollection.mockImplementation(() => ({ doc: () => ({ get: mockUserDoc }) }));

            mockEventInstancesCollection.mockReturnValue({
                where: mockListRevealDateQuery,
            });

            (admin.firestore as unknown as jest.Mock).mockReturnValue({
                collection: (name: string) => {
                    if (name === "eventInstances") {
                        return {
                            where: mockListRevealDateQuery,
                        };
                    }
                    if (name === "users") {
                        return mockUsersCollection();
                    }
                    throw new Error(`Unexpected collection query: ${name}`);
                },
            });

            mockListRevealDateQuery.mockReturnValue({
                where: mockParticipantsProcessedQuery,
            });

            mockParticipantsProcessedQuery.mockReturnValue({
                get: mockGetQueryResult,
            });

            mockDocEvent1.ref.update.mockClear();
            mockDocEvent2.ref.update.mockClear();
        });

        it("processes both event instances and sorts participants with organizer first", async () => {
            await basicSorting(mockNow);

            expect(mockDocEvent1.ref.update).toHaveBeenCalledTimes(1);
            expect(mockDocEvent2.ref.update).toHaveBeenCalledTimes(1);

            const updatedParticipantsEvent1 = mockDocEvent1.ref.update.mock.calls[0][0].participants;
            expect(updatedParticipantsEvent1.length).toBe(2);
            expect(updatedParticipantsEvent1[0].isOrganizer).toBe(true);
            expect(updatedParticipantsEvent1[0].uid).toBe("uid-org-event1");

            const updatedParticipantsEvent2 = mockDocEvent2.ref.update.mock.calls[0][0].participants;
            expect(updatedParticipantsEvent2.length).toBe(2);
            expect(updatedParticipantsEvent2[0].isOrganizer).toBe(true);
            expect(updatedParticipantsEvent2[0].uid).toBe("uid-org-event2");
        });
    });
});
