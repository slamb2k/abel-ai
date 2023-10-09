@description('Hostname of the Static Web App')
param targetHostname string

@description('The name of the DNS zone (e.g. example.com)')
param dnsZoneName string

@description('CNAME record for the custom domain (e.g. XXX.<dns zone>)')
param cnameRecord string = ''

@description('Value of a TXT Record for the custom domain (e.g. F9D1BB76D2F23AF1F05294C92725A4BF70E3718C5F5FC2761803044D16424C3C)')
param validationToken string = ''

var validationTextRecord = 'asuid.${cnameRecord}'
var dnsRecordTimeToLive = 3600

// Add a CNAME record to an existing DNS Zone
resource dnsZone 'Microsoft.Network/dnsZones@2018-05-01' existing = if (dnsZoneName != '') {
  name: dnsZoneName

  resource cname 'CNAME' = if (cnameRecord != '') {
    name: cnameRecord
    properties: {
      TTL: dnsRecordTimeToLive
      CNAMERecord: {
        cname: targetHostname
      }
    }
  }

  resource txt 'TXT' = if (validationToken != '') {
    name: validationTextRecord
    properties: {
      TTL: dnsRecordTimeToLive
      TXTRecords: [
        { value: [ validationToken ] }
      ]
    }
  }
}
