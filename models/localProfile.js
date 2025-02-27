export class LocalProfile {
  constructor(
    name,
    email,
    geo,
    role,
    teamChannel,
    isNewCaseAlertActive,
    isNewCommentAlertActive
  ) {
    (this.name = name),
      (this.email = email),
      (this.geo = geo),
      (this.role = role),
      (this.teamChannel = teamChannel),
      (this.isNewCaseAlertActive = isNewCaseAlertActive),
      (this.isNewCommentAlertActive = isNewCommentAlertActive);
  }
}
