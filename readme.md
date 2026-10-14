# OpenUI5 OData V2 `Edm.Decimal` Pending Changes Reproduction

This repository contains a minimal sample application for reproducing an issue with `sap.ui.model.odata.v2.ODataModel` when updating an `Edm.Decimal` property against an SAP CAP OData V2 service.

After an `Edm.Decimal` property is successfully updated using `submitChanges()`, the changed entity may unexpectedly remain in the result of `getPendingChanges()`. As a consequence, the same entity may be submitted again on a subsequent `submitChanges()` call even though the previous update was successful.

The behavior depends on the CAP database and, when using SQLite, the CAP `ieee754compatible` feature setting.

## Prerequisites

Before running the application, make sure the following prerequisites are available:

- [Node.js](https://nodejs.org/)
- npm
- SAP BTP account with a **Cloud Foundry environment**
- An **SAP HANA Cloud** instance available in the Cloud Foundry space

> **Note**
>
> SAP HANA Cloud is required only for reproducing the issue in HANA mode. An HDI container will be created in the connected Cloud Foundry space.

## Repository Structure

The repository contains two main directories:

```text
.
├── service/    # SAP CAP application
└── ui/         # OpenUI5 application
```

### `service`

Contains the SAP CAP backend application using **CAP version 10**.

The service exposes the data through OData V2.

### `ui`

Contains the OpenUI5 frontend application using **OpenUI5 1.153.0**.

The application uses `sap.ui.model.odata.v2.ODataModel` to communicate with the CAP service.

## CAP `ieee754compatible` Configuration

The CAP application contains the following feature configuration in `service/package.json`:

```json
"features": {
  "ieee754compatible": false
}
```

This setting has an important effect on the reproduction when using **SQLite**.

With CAP 10 and SQLite, the issue can be reproduced when `ieee754compatible` is enabled/defaulted accordingly. Explicitly setting:

```json
"ieee754compatible": false
```

prevents the issue from occurring with SQLite.

However, the same configuration does **not** resolve the issue when using SAP HANA. With HANA, the issue can still be reproduced regardless of this setting.

The observed behavior is therefore:

| Backend | `ieee754compatible: false` | Result |
| --- | --- | --- |
| CAP 10 + SQLite | Yes | ✅ Pending change is cleared |
| CAP 10 + SQLite | No / feature enabled | ❌ Decimal property remains pending |
| CAP 10 + SAP HANA | Yes | ❌ Decimal property remains pending |
| CAP 10 + SAP HANA | No / feature enabled | ❌ Decimal property remains pending |

This difference may be relevant to the underlying cause, particularly regarding the representation or serialization of `Edm.Decimal` values returned by the CAP OData V2 service.

## Installation

### 1. Clone the Repository

Open Visual Studio Code, SAP Business Application Studio, or another development environment and clone this repository.

Then open the cloned repository.

### 2. Log In to Cloud Foundry

Log in to the Cloud Foundry space that you want to use:

```bash
cf login
```

Make sure that the selected Cloud Foundry space has access to an SAP HANA Cloud instance.

> This step is required for running the backend in HANA mode. It is not required if you only want to run the SQLite scenario.

### 3. Install Dependencies

Install the dependencies in both the `service` and `ui` directories.

For the CAP application:

```bash
cd service
npm install
```

For the OpenUI5 application:

```bash
cd ../ui
npm install
```

## Running the Backend

The CAP application can be run either with **SQLite** or **SAP HANA**.

### Option A: SQLite

No additional database setup is required for SQLite.

From the `service` directory, run:

```bash
npm run start-dev
```

The CAP server will start using SQLite.

#### SQLite and `ieee754compatible`

The behavior with SQLite depends on the `ieee754compatible` feature setting in `service/package.json`.

With:

```json
"features": {
  "ieee754compatible": false
}
```

the issue is **not expected to occur**. After a successful update, the changed entity is correctly removed from `getPendingChanges()`.

To reproduce the problematic behavior with SQLite, run the application with the corresponding IEEE 754 compatibility behavior enabled instead. In that configuration, the successfully submitted decimal change remains in `getPendingChanges()`.

This makes SQLite useful for comparing the behavior with and without CAP's IEEE 754 compatibility handling.

### Option B: SAP HANA

To reproduce the issue with SAP HANA, run the CAP application against an SAP HANA Cloud instance.

Unlike SQLite, setting `ieee754compatible` to `false` does **not** prevent the issue from occurring with HANA.

#### 1. Create an HDI Container

From the `service` directory, run:

```bash
npm run create-test-hana-instance
```

This creates an HDI container service instance in the currently connected Cloud Foundry space with the following name:

```text
ui5-odata-v2-decimal-bug-db-test
```

Wait until the service instance has been created successfully before continuing.

#### 2. Bind the Local CAP Application to SAP HANA

Run:

```bash
npm run bind-hana-local
```

This creates a `.cdsrc-private.json` file containing the configuration required for the local CAP application to connect to the HDI container.

The HANA service is bound using CAP's hybrid mode.

#### 3. Deploy the Data Model

Deploy the CAP data model to the newly created HDI container:

```bash
npm run deploy-hana-test
```

This deploys the database model and inserts **10 sample records** into the `Products` table.

The sample data can be found at:

```text
service/db/data/Products.csv
```

#### 4. Start the CAP Server in Hybrid Mode

After the deployment has completed, run:

```bash
npm run start-hybrid
```

The CAP server will start locally and connect to the SAP HANA HDI container using the configuration in `.cdsrc-private.json`.

> **Note**
>
> Creating the HDI container, binding it locally, and deploying the model are initial setup steps and normally only need to be performed once.
>
> For subsequent runs, `npm run start-hybrid` is sufficient as long as the HDI container and local binding configuration still exist.

## Running the OpenUI5 Application

Open a second terminal and navigate to the `ui` directory:

```bash
cd ui
```

Start the application:

```bash
npm start
```

The UI application will be available at:

[http://localhost:8080/index.html](http://localhost:8080/index.html)

## Reproducing the Issue

Start the backend using one of the configurations in which the issue occurs:

- **SAP HANA**, regardless of the `ieee754compatible` setting, or
- **SQLite** with the IEEE 754 compatibility behavior enabled.

Then perform the following steps:

1. Open [http://localhost:8080/index.html](http://localhost:8080/index.html).
2. The initial page displays a table containing the sample products.
3. Select a record from the table.
4. Press the **Edit** (pencil) button in the upper-right corner of the table.
5. An edit dialog opens with the selected entity context bound to it.
6. Locate the **Price** field.
7. Change **only the integer part** of the decimal value while keeping the fractional part unchanged.
8. Press **Save**.

For example:

```text
Before: 150.00
After:  130.00
```

The application submits the modification using `sap.ui.model.odata.v2.ODataModel#submitChanges`.

After the update completes successfully, the application calls:

```js
oModel.getPendingChanges()
```

and displays the stringified result in a `MessageBox.information`.

### Actual Result

Although the update request completes successfully, `getPendingChanges()` still contains the modified entity and its decimal property.

In other words, the OData V2 model behaves as if the successfully submitted change were still pending.

Because the change remains pending, the same entity can also be included again in a subsequent `submitChanges()` call even though it has already been successfully persisted.

### Expected Result

After `submitChanges()` completes successfully, the submitted change should be removed from the model's pending changes.

Therefore:

```js
oModel.getPendingChanges()
```

should no longer contain the successfully updated entity, provided that no additional modifications were made afterward.

## Comparing the Different Configurations

The following configurations can be used to compare the behavior:

| Configuration | Result |
| --- | --- |
| CAP 10 + SQLite + `ieee754compatible: false` | ✅ Pending change is cleared |
| CAP 10 + SQLite + IEEE 754 compatibility enabled | ❌ Decimal property remains pending |
| CAP 10 + SAP HANA + `ieee754compatible: false` | ❌ Decimal property remains pending |
| CAP 10 + SAP HANA + IEEE 754 compatibility enabled | ❌ Decimal property remains pending |

In particular, the fact that `ieee754compatible: false` changes the behavior with SQLite but has no effect when using HANA may provide a useful indication of where the difference in decimal representation originates.

## Relevant Code

The dialog binding, update logic, `submitChanges()` call, and `getPendingChanges()` check can be found in:

```text
ui/webapp/controller/Homepage.controller.js
```

The CAP feature configuration discussed above can be found in:

```text
service/package.json
```