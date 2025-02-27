export class CaseComment {
  constructor (
    id,
    parentId,
    createdDate,
    createdById,
    isPublished,
    commentBody
  ) {
    this.id = id;
    this.parentId = parentId;
    this.createdDate = createdDate;
    this.createdById = createdById;
    this.isPublished = isPublished;
    this.commentBody = commentBody;
  }
}
