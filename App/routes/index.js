const express = require('express');
const router = express.Router();
const os = require('os');

class MyClientAssertionCredential {
  constructor() {
      let clientAssertion = ""
      try {
          clientAssertion = fs.readFileSync(process.env.AZURE_FEDERATED_TOKEN_FILE, "utf8")
      } catch (err) {
          console.log("Failed to read client assertion file: " + err)
          process.exit(1)
      }

      this.app = new msal.ConfidentialClientApplication({
          auth: {
              clientId: process.env.AZURE_CLIENT_ID,
              authority: `${process.env.AZURE_AUTHORITY_HOST}${process.env.AZURE_TENANT_ID}`,
              clientAssertion: clientAssertion,
          }
      })
  }

  async getToken(scopes) {
      const token = await this.app.acquireTokenByClientCredential({ scopes: [scopes] }).catch(error => console.log(error))
      return new Promise((resolve, reject) => {
          if (token) {
              resolve({
                  token: token.accessToken,
                  expiresOnTimestamp: token.expiresOn.getTime(),
              })
          } else {
              reject(new Error("Failed to get token silently"))
          }
      })
  }
}



const { DefaultAzureCredential } = require("@azure/identity");
const { AuthorizationManagementClient } = require("@azure/arm-authorization");

const subscriptionId = process.env["AZURE_SUBSCRIPTION_ID"];
const servicePrincipalObjectId = process.env["AZURE_SERVICE_PRINCIPAL_OBJECT_ID"];

async function getAppRoleAssignments() {

  const credential = new MyClientAssertionCredential()
  const client = new AuthorizationManagementClient(credential, subscriptionId);

  return client.roleAssignments.listForScope(`subscriptions/${subscriptionId}`, { filter: `assignedTo('{${servicePrincipalObjectId}}')` });

}

async function getAppInfo2(req, res, next) {
  try {
    const assignments = await getAppRoleAssignments();
    res.json(assignments);
  } 
  catch (err) {
    next(err);
  }
}

async 

async function getAppInfo(req, res, next) {

  let status = 'OK';
  let roleAssignments = [];

  try {
    const result = await getAppRoleAssignments();
    console.log("The result is:", result);

    roleAssignments = JSON.parse(JSON.stringify(result));
    console.log(roleAssignments);

  } catch (error) {
    status = error;
    console.log("An error occurred:");
    console.error(error);

  }

  const podInfo = [
    {
      name: 'Pod Host',
      value: os.hostname()
    },
    {
      name: 'Pod uptime',
      value: os.uptime() + ' secs'
    },
    {
      name: 'Pod CPU load',
      value: os.loadavg()
    },
    {
      name: 'Pod Total Memory',
      value: (os.totalmem() / (1024 * 1024 * 1024), 2).toFixed(2) + ' GB'
    },
    {
      name: 'Pod Free Memory',
      value: (os.freemem() / (1024 * 1024 * 1024), 2).toFixed(2) + ' GB'
    },
    {
      name: 'Pod CPU Count',
      value: os.cpus().length
    }
  ]

  res.render('index', { title: 'Pod Info', status, podInfo, roleAssignments });

}

/* GET home page. */
router.get('/', getAppInfo);


module.exports = router;
