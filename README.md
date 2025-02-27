# Prom Master 2.0

This repository is created to develop and maintain the ProM Master chrome extension for Proactive Monitoring Team.

This extension is create to enhance productivity of the TEs and provide them with useful tools and resources to ease the day-to-day activities and automates manual processes as much as possible.

This tool extracts the session ID of the currently logged-in user from the browser's cookie. It then uses the acquired session ID to invoke REST APIs in the Salesforce platform. In essence, this tool does not handle the authentication process itself.

Below are the features and tools provided by the extension as of the current release -

## Modularised Approach

The extension is re-written to adopt a much more modularised approach following standard web development best practices. We have tried to follow the MVC pattern as far as possible. Below are is the project structure explained -

- Views
  - Contains all the html files
- Controllers
  - Contains all the js files directly bound to the respective html files
- Model
  - Contains all Javscript Classes for Object oriented design
- Service
  - Contains all service methods to interact with Chrome APIs and Salesforce APIs
- Utils
  - Contains utility methods to be used across the code

## Enablement of Local Profile

- The extension now supports Local Profile so that users can configure the extension as per their requirement.
- The Local Profile is saved to the Local Storage and is retained for the Lifetime of the chrome extension.
- Users have the ability to edit their Settings as required
- New Roles Features -
  - TE - Access all tools for TE work
  - MDE - Access Special Tools for MDE Duties
  - QA - Access special tools for ProM QA Team
  - Manager - Few tools to help Managers get required datat

## Auth Contexts

The extension function by exposing two Auth Contexts -

- Local Auth Context
  - This is built on the basis of the Settings configured by the User and can be used to check the Local Settings of the User anywhere in the application.
- Salesforce Auth Context
  - This auth context is built on the basis of Sessions present in the Chrome cache. The session tokens for OrgCS, GUS & MCS are fetched if available and used for authorization of all calls to the Salesforce APIs via JSForce

## New Chrome Notifications

The extension now utilised the Google Chrome notifications to send only the configured alerts to the Users, that too not via irritating popups that block User actions. We use the NotificationService for this functionality.

## Plugin Tools & Features

The extension offers below tools & features -

- Home
  - Provides a consolidated metrics dashboard to get an overview to important data like no.of alerts received during shift, customer comments, public comments, internal comments, cases closed & internal cases in queue
- Case Reassingment Tool
  - Updated version supporting GEO-vise segregation of engineers and more new features!
- Case Comments Tool
  - Tools to check alerts on your cases in a selected time slot. It now provide engineers with option to "Mark as Done" & "Already Updated"
- Customer Comment Tool
  - Check customer comments on cases. New features like highlighting of comments if SLA is not Met etc
- Closure Comments Tool
  - Get cases eligible for Closures, generate automated closure templates & re-distribute Closure Cases for equal closure opportunities for the team
- Easy GHO -
  - Generate GHO template messages and post on your cases for efficient Handover
- Alert Checker -
  - Check alerts received on Cases for Specific Accounts and Specific Orgs in a given timeframe.
- QA Tools
  - Used for Automation of ProM QA Process (Only available to QA Team Members)
