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
  
    type WasteEntryPayload = Record<{
    wasteType: string;
    quantity: number;
    location: string; 
    isVerified: boolean; 
    recycledQuantity?: number;
  }>;
  
    const wasteEntryStorage = new StableBTreeMap<string, WasteEntry>(0, 44, 1024);
  
     $update;
  export function createWasteEntry(payload: WasteEntryPayload): Result<WasteEntry, string> {
    const wasteEntry: WasteEntry = {
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
      userId: ic.caller(),
      ...payload,
    };
  
    wasteEntryStorage.insert(wasteEntry.id, wasteEntry);
    return Result.Ok<WasteEntry, string>(wasteEntry);
  }
  
  
      $query;
   export function getWasteEntry(id: string): Result<WasteEntry, string> {
    return match(wasteEntryStorage.get(id), {
      Some: (entry) => Result.Ok<WasteEntry, string>(entry),
      None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
    });
  }
  
     $query;
  export function getAllWasteEntries(): Result<Vec<WasteEntry>, string> {
    return Result.Ok(wasteEntryStorage.values());
  }
  
      $update;
  export function updateWasteEntry(id: string, payload: WasteEntryPayload): Result<WasteEntry, string> {
    return match(wasteEntryStorage.get(id), {
      Some: (existingEntry) => {
        const updatedEntry: WasteEntry = {
          ...existingEntry,
          ...payload,
          updatedAt: Opt.Some(ic.time()),
        };
  
        wasteEntryStorage.insert(updatedEntry.id, updatedEntry);
        return Result.Ok<WasteEntry, string>(updatedEntry);
      },
      None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
    });
  }
  
      $update;
  export function deleteWasteEntry(id: string): Result<WasteEntry, string> {
    return match(wasteEntryStorage.get(id), {
      Some: (existingEntry) => {
        wasteEntryStorage.remove(id);
        return Result.Ok<WasteEntry, string>(existingEntry);
      },
      None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
    });
  }
  
      $update;
    export function verifyWasteEntry(id: string): Result<WasteEntry, string> {
    return match(wasteEntryStorage.get(id), {
      Some: (entry) => {
        const updatedEntry: WasteEntry = {
          ...entry,
          isVerified: true,
          updatedAt: Opt.Some(ic.time()),
        };
  
        wasteEntryStorage.insert(updatedEntry.id, updatedEntry);
        return Result.Ok<WasteEntry, string>(updatedEntry);
      },
      None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
    });
  }
  
      $query;
  export function getVerifiedWasteEntries(): Result<Vec<WasteEntry>, string> {
    const verifiedEntries = wasteEntryStorage.values().filter((entry) => entry.isVerified);
    return Result.Ok(verifiedEntries);
  }
  
       
      $update;
  export function recycleWaste(id: string, recycledQuantity: number): Result<WasteEntry, string> {
    return match(wasteEntryStorage.get(id), {
      Some: (existingEntry) => {
        if (recycledQuantity <= existingEntry.quantity) {
          const updatedEntry: WasteEntry = {
            ...existingEntry,
            quantity: existingEntry.quantity - recycledQuantity,
            recycledQuantity: (existingEntry.recycledQuantity || 0) + recycledQuantity,
            updatedAt: Opt.Some(ic.time()),
          };
  
          wasteEntryStorage.insert(updatedEntry.id, updatedEntry);
          return Result.Ok<WasteEntry, string>(updatedEntry);
        } else {
          return Result.Err<WasteEntry, string>(`Recycled quantity exceeds available quantity.`);
        }
      },
      None: () => Result.Err<WasteEntry, string>(`Waste Entry with ID=${id} not found.`),
    });
  }
  
  
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
