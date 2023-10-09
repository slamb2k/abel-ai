@description('The name of the app service to add the custom domains to.')
param webAppName string

@description('The location of the app service.')
param location string

@description('The id of the app service plan.')
param appServicePlanResourceId string

@description('The custom hostnames that you wish to add.')
param customHostnames array = []

@description('Deploy hostnames without SSL binding before creating the certificate. Required when hostname is not present yet.')
param redeployHostnames bool = false

// hostname bindings must be deployed one by one to prevent Conflict (HTTP 429) errors.
@batchSize(1)
resource customHostnameWithoutSsl 'Microsoft.web/sites/hostnameBindings@2019-08-01' = [for fqdn in customHostnames: if (redeployHostnames) {
  name: '${webAppName}/${fqdn}'
  properties: {
    siteName: webAppName
    hostNameType: 'Verified'
    sslState: 'Disabled'
  }
}]

// certificates must be bound via module/nested template, because each resource can only occur once in every template
// in this case the hostnameBindings would occur twice otherwise.
module certificateBindings './bindCertificateToHostname.bicep' = {
  name: '${deployment().name}-ssl'
  params: {
    appServicePlanResourceId: appServicePlanResourceId
    customHostnames: customHostnames
    location: location
    webAppName: webAppName
  }
  dependsOn: customHostnameWithoutSsl
}
