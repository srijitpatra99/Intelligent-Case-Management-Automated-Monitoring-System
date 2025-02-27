export class QualityAnalysis {
  constructor (
    dateTimeOpened,
    dateTimeClosed,
    caseNumber,
    alertName,
    typeOfCaseUpdate,
    caseUpdatedBy,
    caseUpdatedByUserid,   // updated by Basha Please change down this.caseupdatedbyuserid also
    emailId,
    orgId,
    subject,
    internalComment,
    hasAdditionalInfo,
    isSlaMet,
    isEvaluationPeriodPresent,
    isCaseStatusChanged,
    isCaseDescriptionUpdated,
    isClosedStatusUpdated,
    isVisibleInSelfServicePortal,
    alertMissedBy,
    customerCommentMissedBy,
    geoName,
    qaDoneBy,
    qaDoneDate,
    publicCommentCreatedById,
    internalCommentCreatedById,
    firstOwner,
    nextOwner,
    commentContent
  ) {
    (this.dateTimeOpened = dateTimeOpened), (this.dateTimeClosed = dateTimeClosed), (this.caseNumber = caseNumber), (this.alertName = alertName), (this.typeOfCaseUpdate = typeOfCaseUpdate), (this.caseUpdatedBy = caseUpdatedBy), (this.caseUpdatedByUserid = caseUpdatedByUserid), (this.emailId = emailId), (this.hasAdditionalInfo = hasAdditionalInfo), (this.isSlaMet = isSlaMet), (this.isEvaluationPeriodPresent = isEvaluationPeriodPresent), (this.isCaseStatusChanged = isCaseStatusChanged), (this.isClosedStatusUpdated = isClosedStatusUpdated), (this.isVisibleInSelfServicePortal = isVisibleInSelfServicePortal), (this.alertMissedBy = alertMissedBy), (this.customerCommentMissedBy = customerCommentMissedBy), (this.geoName = geoName), (this.qaDoneBy = qaDoneBy), (this.qaDoneDate = qaDoneDate), (this.publicCommentCreatedById = publicCommentCreatedById), (this.internCommentCreatedById = internalCommentCreatedById), (this.firstOwner = firstOwner), (this.nextOwner = nextOwner), (this.commentContent = commentContent);
    this.isCaseDescriptionUpdated = isCaseDescriptionUpdated;
  }
}
