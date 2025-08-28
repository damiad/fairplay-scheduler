import { collection, getDocs, query, where } from "@firebase/firestore";
import { db } from "../services/firebase"; // Assuming this path is correct for your setup

/**
 * Generates a URL-friendly slug from a string.
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
};

/**
 * Checks if a slug is unique in the 'groups' collection.
 */
export const isSlugUnique = async (
  slug: string,
  currentGroupId?: string
): Promise<boolean> => {
  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("slug", "==", slug));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return true; // Slug is definitely unique.
  }

  // If we are editing, a slug is "unique" if it only belongs to the current group.
  if (currentGroupId) {
    return querySnapshot.docs.every((doc) => doc.id === currentGroupId);
  }

  // If we are creating and found any document, it's not unique.
  return false;
};

/**
 * Validates group details before creating or updating.
 * @returns A promise that resolves with an object containing validation status, an optional error message, and the generated slug.
 */
export const validateGroupDetails = async (
  groupName: string,
  ownerUids: string[],
  currentGroupId?: string
): Promise<{ isValid: boolean; error?: string; slug: string }> => {
  const slug = generateSlug(groupName);

  if (ownerUids.length === 0) {
    return {
      isValid: false,
      error: "A group must have at least one owner.",
      slug,
    };
  }

  const unique = await isSlugUnique(slug, currentGroupId);
  if (!unique) {
    return {
      isValid: false,
      error:
        "A group with this name already exists ( " +
        slug +
        " ). Please choose another name.",
      slug,
    };
  }

  return { isValid: true, slug };
};
