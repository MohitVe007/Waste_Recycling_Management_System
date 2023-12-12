import {
  $update,
  $query,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the WasteEntry type for storing waste entry information
type WasteEntry = Record<{
  id: string;
  userId: Principal;
  wasteType: string;
  quantity: number;
  recycledQuantity?: number;
  location: string;
  isVerified: boolean;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the WasteEntryPayload type for creating or updating waste entries
type WasteEntryPayload = Record<{
  wasteType: string;
  quantity: number;
  location: string;
  isVerified: boolean;
  recycledQuantity?: number;
}>;

// Create StableBTreeMap to store waste entries
const wasteEntryStorage = new StableBTreeMap<string, WasteEntry>(0, 44, 1024);

$update;
// Function to create a new waste entry
export function createWasteEntry(payload: WasteEntryPayload): Result<WasteEntry, string> {
  // Payload Validation
  if (!payload.wasteType || payload.quantity === undefined || !payload.location) {
    return Result.Err<WasteEntry, string>("Invalid payload");
  }

  // Input Validation
  if (payload.quantity < 0) {
    return Result.Err<WasteEntry, string>("Quantity must be non-negative.");
  }

  // Create a new waste entry record
  const wasteEntry: WasteEntry = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    userId: ic.caller(),
    ...payload
  };

  try {
    wasteEntryStorage.insert(wasteEntry.id, wasteEntry);
    return Result.Ok<WasteEntry, string>(wasteEntry);
  } catch (error) {
    return Result.Err<WasteEntry, string>("Failed to create waste entry");
  }
}

$query;
// Function to get a waste entry by ID
export function getWasteEntry(id: string): Result<WasteEntry, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<WasteEntry, string>('Invalid ID parameter.');
  }

  return match(wasteEntryStorage.get(id), {
    Some: (entry) => Result.Ok<WasteEntry, string>(entry),
    None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
  });
}

$query;
// Function to get all waste entries
export function getAllWasteEntries(): Result<Vec<WasteEntry>, string> {
  try {
    // Return all waste entries
    return Result.Ok(wasteEntryStorage.values());
  } catch (error) {
    return Result.Err(`Error retrieving waste entries: ${error}`);
  }
}

$update;
// Function to update a waste entry
export function updateWasteEntry(id: string, payload: WasteEntryPayload): Result<WasteEntry, string> {
  // Payload Validation
  if (!payload.wasteType || payload.quantity === undefined || !payload.location) {
    return Result.Err<WasteEntry, string>("Invalid payload");
  }

  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<WasteEntry, string>('Invalid ID parameter.');
  }

  return match(wasteEntryStorage.get(id), {
    Some: (existingEntry) => {
      // Selective Update
      const updatedEntry: WasteEntry = {
        ...existingEntry,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        wasteEntryStorage.insert(updatedEntry.id, updatedEntry);
        return Result.Ok<WasteEntry, string>(updatedEntry);
      } catch (error) {
        return Result.Err<WasteEntry, string>(`Failed to update Waste Entry with ID=${id}. Error: ${error}`);
      }
    },
    None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
  });
}

$update;
// Function to delete a waste entry by ID
export function deleteWasteEntry(id: string): Result<WasteEntry, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<WasteEntry, string>('Invalid ID parameter.');
  }

  return match(wasteEntryStorage.get(id), {
    Some: (existingEntry) => {
      // Remove the waste entry from the storage
      wasteEntryStorage.remove(id);
      return Result.Ok<WasteEntry, string>(existingEntry);
    },
    None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
  });
}

$update;
// Function to verify a waste entry
export function verifyWasteEntry(id: string): Result<WasteEntry, string> {
  // Parameter Validation
  if (typeof id !== 'string') {
    return Result.Err<WasteEntry, string>('Invalid ID parameter.');
  }

  return match(wasteEntryStorage.get(id), {
    Some: (entry) => {
      // Update verification status
      const updatedEntry: WasteEntry = {
        ...entry,
        isVerified: true,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        wasteEntryStorage.insert(updatedEntry.id, updatedEntry);
        return Result.Ok<WasteEntry, string>(updatedEntry);
      } catch (error) {
        return Result.Err<WasteEntry, string>(`Failed to update Waste Entry with ID=${id}. Error: ${error}`);
      }
    },
    None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
  });
}

$query;
// Function to get all verified waste entries
export function getVerifiedWasteEntries(): Result<Vec<WasteEntry>, string> {
  // Filter verified entries
  const verifiedEntries = wasteEntryStorage.values().filter((entry) => entry.isVerified);
  return Result.Ok(verifiedEntries);
}

$update;
// Function to recycle waste
export function recycleWaste(id: string, recycledQuantity: number): Result<WasteEntry, string> {
  return match(wasteEntryStorage.get(id), {
    Some: (existingEntry) => {
      // Check if recycled quantity is valid
      if (recycledQuantity <= existingEntry.quantity) {
        // Update quantities
        const updatedEntry: WasteEntry = {
          ...existingEntry,
          quantity: existingEntry.quantity - recycledQuantity,
          recycledQuantity: (existingEntry.recycledQuantity || 0) + recycledQuantity,
          updatedAt: Opt.Some(ic.time()),
        };

        try {
          wasteEntryStorage.insert(updatedEntry.id, updatedEntry);
          return Result.Ok<WasteEntry, string>(updatedEntry);
        } catch (error) {
          return Result.Err<WasteEntry, string>(`Failed to update Waste Entry with ID=${id}. Error: ${error}`);
        }
      } else {
        return Result.Err<WasteEntry, string>(`Recycled quantity exceeds available quantity.`);
      }
    },
    None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
  });
}

// Cryptographic utility for generating random values
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
