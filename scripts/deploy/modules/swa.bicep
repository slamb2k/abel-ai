@description('Which region should we deploy the swa into?')
param location string = resourceGroup().location

resource swa 'Microsoft.Web/staticSites@2022-09-01' = {
  name: 'swa-${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    tier: 'Free'
    name: 'Free'
  }
  properties: {}
}

output name string = swa.name
output hostname string = swa.properties.defaultHostname
