# Prom Master

## Overview
**Prom Master** is a Chrome extension developed for the **Proactive Monitoring (ProM) Team** to enhance productivity, automate manual processes, and provide useful tools for **Technical Engineers (TEs)**.

This extension extracts the **session ID** of the currently logged-in user from the browser's cookie and uses it to invoke **Salesforce REST APIs**..

---
## 📸 Screenshots
![WelcomePage](https://github.com/srijitpatra99/Prom-Master/blob/main/Screens/WelcomePage.jpg?raw=true)
 ![Case Commments](https://github.com/srijitpatra99/Prom-Master/blob/main/Screens/CaseComments.jpg?raw=true)
 ![Customer Comments](https://github.com/srijitpatra99/Prom-Master/blob/main/Screens/CustomerComments.jpg?raw=true)
 ![Notification](https://github.com/srijitpatra99/Prom-Master/blob/main/Screens/Notification.jpg?raw=true)
 ![CaseReassignment](https://github.com/srijitpatra99/Prom-Master/blob/main/Screens/CaseReassignment.jpg?raw=true)
 ![Deployment](https://github.com/srijitpatra99/Prom-Master/blob/main/Screens/Deployment.jpg?raw=true)
 
## Features & Tools

### 🚀 **Modularized Approach**
The extension follows a **modularized** design with best practices in **web development**. It adopts an **MVC pattern** with the following structure:

📂 **Views** - Contains all HTML files.
📂 **Controllers** - JavaScript files directly bound to respective HTML files.
📂 **Model** - JavaScript classes for object-oriented design.
📂 **Service** - Methods to interact with Chrome APIs & Salesforce APIs.
📂 **Utils** - Utility methods used across the project.

### 🛠 **Local Profile Enablement**
- Users can **configure** and **customize** the extension based on their requirements.
- The **Local Profile** is stored in **Local Storage** and retained for the lifetime of the extension.
- Users can edit their **Settings** at any time.

### 👥 **Role-Based Access Control**
- **TE** - Access to all TE-related tools.
- **MDE** - Special tools for **MDE Duties**.
- **QA** - Tools for **ProM QA Team**.
- **Manager** - Specialized tools for **Managerial Data Insights**.

### 🔐 **Auth Contexts**
The extension operates with two **Auth Contexts**:
1. **Local Auth Context** - Based on **user-configured settings**, accessible anywhere in the application.
2. **Salesforce Auth Context** - Extracts **session tokens** from **Chrome cache** (OrgCS, GUS, MCS) to **authorize API calls** using **JSForce**.

### 🔔 **Chrome Notifications**
- Utilizes **Google Chrome notifications** for alerts.
- Only **configured** alerts are sent.
- No **popup interruptions** that block user actions.
- Uses **NotificationService** for streamlined notifications.

---
## 🔧 **Plugin Tools & Features**

### 📊 **Home Dashboard**
- Provides a **consolidated metrics dashboard**.
- Key metrics include:
  - **Alerts received** during shift.
  - **Customer Comments, Public Comments, Internal Comments**.
  - **Cases Closed & Internal Cases in Queue**.

### 🔄 **Case Reassignment Tool**
- Supports **geo-based engineer segregation**.
- Additional new features for better case management.

### 📝 **Case Comments Tool**
- Tracks **alerts** on cases within a specific timeframe.
- Features:
  - **Mark as Done** ✅.
  - **Already Updated** option.

### 💬 **Customer Comment Tool**
- Monitors **customer comments** on cases.
- Highlights comments if **SLA is not met**.

### 📌 **Easy GHO (Global Handover)**
- Generates **GHO template messages**.
- Facilitates **efficient case handover**.

### 🚨 **Alert Checker**
- Checks **alerts on cases** for specific accounts and orgs within a given timeframe.

### 🛡 **QA Tools**
- Automates **ProM QA processes**.
- **Exclusive access** for **QA Team Members**.

---
## 📜 **Installation & Usage**
1. Clone the repository:
   ```sh
   git clone https://github.com/srijitpatra99/Prom-Master.git
   ```
2. Load the extension in Chrome:
   - Open `chrome://extensions/`.
   - Enable **Developer Mode**.
   - Click **Load Unpacked**.
   - Select the **extension folder**.
3. Configure your **Local Profile** and start using the tools!

---
## 🤝 **Contributing**
Contributions are welcome! To contribute:
- Fork the repository.
- Create a feature branch.
- Submit a **Pull Request (PR)**.

---
## 📜 **License**
This project is licensed under the **MIT License**.

