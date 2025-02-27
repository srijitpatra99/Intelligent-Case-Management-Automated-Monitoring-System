export class Case {
  constructor (
    id,
    ownerId,
    caseNumber,
    createdDate,
    closedDate,
    status,
    productTopic,
    productFeature
  ) {
    (this.id = id), (this.ownerId = ownerId), (this.caseNumber = caseNumber), (this.createdDate = createdDate), (this.closedDate = closedDate), (this.status = status), (this.productTopic = productTopic), (this.productFeature = productFeature);
  }
}
