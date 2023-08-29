import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as google from "@pulumi/google-native";
import * as github from "@pulumi/github";

const proj_id = "securitydojo"
const github_owner = "s3curitydojolab"

const name = "github-actions"
const github_repo = "gh-actions-auto-merger"

// Create a service account with the highly unique name `github-action`
const serviceAccount = new google.iam.v1.ServiceAccount(name, {
    accountId: "github-actions"
})

// Giving our brand new service account the permissions required to create a workload identity pool
new gcp.projects.IAMMember("github-actions", {
    role: "roles/iam.workloadIdentityPoolAdmin",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
    project: proj_id
})

// Generating an Identity Pool with the random name `github-actions-{random-number}`
const identityPool = new gcp.iam.WorkloadIdentityPool("github-actions", {
  disabled: false,
  workloadIdentityPoolId: `${name}-${Math.floor(Math.random() * 99)}`,
});

// Setting up Github as an Identity Provider and ensuring the attributes obtained are in a format that GCloud understands
const identityPoolProvider = new gcp.iam.WorkloadIdentityPoolProvider(
  "github-actions",
  {
    workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
    workloadIdentityPoolProviderId: `${name}`,
    oidc: {
      issuerUri: "https://token.actions.githubusercontent.com",
    },
    attributeMapping: {
      "google.subject": "assertion.sub",
      "attribute.actor": "assertion.actor",
      "attribute.repository": "assertion.repository",
    },
  }
);

// Using the service account to create a Workload Identity User
new gcp.serviceaccount.IAMMember("repository", {
    serviceAccountId: serviceAccount.name,
    role: "roles/iam.workloadIdentityUser",
    member: pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/attribute.repository/${github_owner}/${github_repo}`
})

// Setting up secrets on github so as to avoid hardcoding anything of value
new github.ActionsSecret("identityProvider", {
    repository: `${github_repo}`,
    secretName: "WORKLOAD_IDENTITY_PROVIDER",
    plaintextValue: identityPoolProvider.name,
  });

new github.ActionsSecret("subscriptionId", {
    repository: `${github_repo}`,
    secretName: "SERVICE_ACCOUNT_EMAIL",
    plaintextValue: serviceAccount.email,
  });

new github.ActionsSecret("gcloudprojectID", {
  repository: `${github_repo}`,
  secretName: "GCLOUD_PROJECT_ID",
  plaintextValue: `${proj_id}`
})

// Exporting Workload Identity Provider URL and Service Account Email for visibility
export const workloadIdentityProviderUrl = identityPoolProvider.name
export const serviceAccountEmail = serviceAccount.email
