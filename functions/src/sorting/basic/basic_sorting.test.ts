import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

import { Participant } from "../../../../types";
import { basicSorting } from "./basic_sorting";

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
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

describe("basicSorting", () => {
  const mockNow = Timestamp.fromDate(new Date("2025-03-01T10:00:00Z"));
  const twoHoursAgo = Timestamp.fromMillis(
    mockNow.toMillis() - 2 * 60 * 60 * 1000
  );

  const mockEventInstancesCollection = jest.fn();
  const mockFirstWhere = jest.fn();
  const mockSecondWhere = jest.fn();
  const mockGetQueryResult = jest.fn();
  const mockBatchUpdate = jest.fn();
  const mockBatchCommit = jest.fn();
  const mockBatchFactory = jest.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  }));

  beforeEach(() => {
    // Now, when we mock the return value of firestore(), the Timestamp property remains available
    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: mockEventInstancesCollection,
      batch: mockBatchFactory,
    });

    mockEventInstancesCollection.mockReturnValue({ where: mockFirstWhere });
    mockFirstWhere.mockReturnValue({ where: mockSecondWhere });
    mockSecondWhere.mockReturnValue({ get: mockGetQueryResult });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should correctly query for events in the last 2 hours", async () => {
    mockGetQueryResult.mockResolvedValue({ docs: [] });
    await basicSorting(mockNow);

    expect(mockEventInstancesCollection).toHaveBeenCalledWith("eventInstances");
    expect(mockFirstWhere).toHaveBeenCalledWith(
      "listRevealDateTime",
      ">=",
      twoHoursAgo
    );
    expect(mockSecondWhere).toHaveBeenCalledWith(
      "listRevealDateTime",
      "<=",
      mockNow
    );
  });

  it("should skip an instance if 'participantsListProcessed' is true", async () => {
    const mockDoc = {
      id: "mockInstanceAlreadyProcessed",
      data: () => ({
        listRevealDateTime: mockNow,
        participantsListProcessed: true,
        participants: [],
        eventId: "event123",
      }),
    };

    mockGetQueryResult.mockResolvedValue({ docs: [mockDoc] });
    await basicSorting(mockNow);

    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  describe("when event has participants", () => {
    const mockUserGet = jest.fn();

    beforeEach(() => {
      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        batch: mockBatchFactory,
        collection: (name: string) => {
          if (name === "eventInstances") {
            return { where: mockFirstWhere };
          }
          if (name === "users") {
            return { doc: () => ({ get: mockUserGet }) };
          }
          throw new Error(`Unexpected collection query: ${name}`);
        },
      });
    });

    it("sorts participants with organizer first, then by last attendance", async () => {
      const mockParticipants: Participant[] = [
        {
          uid: "uid-nonorg-recent-attendance",
          displayName: "Non Org Recent",
          photoURL: "url2",
          isOrganizer: false,
          registeredAt: mockNow as any,
        },
        {
          uid: "uid-organizer",
          displayName: "Organizer User",
          photoURL: "url1",
          isOrganizer: true,
          registeredAt: mockNow as any,
        },
        {
          uid: "uid-nonorg-no-attendance",
          displayName: "Non Org None",
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
        ref: {},
      };

      mockUserGet
        .mockResolvedValueOnce({
          data: () => ({
            attendanceHistory: {
              event123: Timestamp.fromDate(new Date("2024-12-01T00:00:00Z")),
            },
          }),
        })
        .mockResolvedValueOnce({ data: () => ({ attendanceHistory: {} }) })
        .mockResolvedValueOnce({ data: () => ({ attendanceHistory: {} }) });

      mockGetQueryResult.mockResolvedValue({ docs: [mockDoc] });

      await basicSorting(mockNow);

      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);

      const updateCallArgs = mockBatchUpdate.mock.calls[0][1];
      const updatedParticipants = updateCallArgs.participants as Participant[];

      expect(updatedParticipants[0].uid).toBe("uid-organizer");
      expect(updatedParticipants[1].uid).toBe("uid-nonorg-no-attendance");
      expect(updatedParticipants[2].uid).toBe("uid-nonorg-recent-attendance");
      expect(updateCallArgs.participantsListProcessed).toBe(true);
    });
  });
});
