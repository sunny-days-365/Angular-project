// UUIDManager class: A singleton that manages UUID duplication and used UUIDs
export class SingletonTaskHandlingIdHandler {
  private static instance: SingletonTaskHandlingIdHandler;
  private uuidSet: Set<string>;

  private constructor() {
    this.uuidSet = new Set<string>();
  }

  // Get the singleton instance
  public static getInstance(): SingletonTaskHandlingIdHandler {
    if (!SingletonTaskHandlingIdHandler.instance) {
      SingletonTaskHandlingIdHandler.instance =
        new SingletonTaskHandlingIdHandler();
    }
    return SingletonTaskHandlingIdHandler.instance;
  }

  // Generate a new UUID and ensure it does not duplicate existing UUIDs
  public generateTaskId(): string {
    let newUUID: string;

    do {
      // Use crypto.randomUUID() in browser environment
      newUUID = self.crypto.randomUUID();
    } while (this.uuidSet.has(newUUID));

    this.uuidSet.add(newUUID);
    return newUUID;
  }

  // Remove the used UUID
  public removeTaskId(uuid: string): boolean {
    if (this.uuidSet.has(uuid)) {
      this.uuidSet.delete(uuid); // Also remove from uuidSet (if necessary)
      return true; // Successfully removed
    }
    return false; // The used UUID does not exist
  }
}
