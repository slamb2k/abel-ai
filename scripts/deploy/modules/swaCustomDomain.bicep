param staticWebAppName string
param customDomainName string

// Add a Custom Domain child resource to the existing Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' existing = {
  name: staticWebAppName

  resource prodCustomDomain 'customDomains' = {
    name: customDomainName
  }
}

output customDomain string = customDomainName
