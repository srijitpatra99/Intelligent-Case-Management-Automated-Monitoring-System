export class CaseOwnershipChange {
  constructor (createdAt, oldOwner, newOwner) {
    this.createdAt = createdAt;
    this.oldOwner = oldOwner;
    this.newOwner = newOwner;
  }
}
