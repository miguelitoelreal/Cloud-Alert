import sys

f = r'C:\Users\Tottus Electro\Desktop\subir nuevamente\Cloud-Alert\src\MonitoringPlatform.API\Controllers\MicrosoftIntegrationsController.cs'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

old1 = 'MetadataJson = """{"ServiceNames":["Exchange Online","Microsoft Teams","SharePoint Online","OneDrive for Business","Microsoft 365 suite","Microsoft 365 admin center","Viva Engage","Microsoft Defender for Office 365"],"ServiceKeywords":["Exchange","Teams","SharePoint","OneDrive","Microsoft 365","Outlook","Office on the web","Defender for Office 365","Viva"]}""",'
new1 = 'MetadataJson = "{\\"ServiceNames\\":["\\"Exchange Online\\"","\\"Microsoft Teams\\"","\\"SharePoint Online\\"","\\"OneDrive for Business\\"","\\"Microsoft 365 suite\\"","\\"Microsoft 365 admin center\\"","\\"Viva Engage\\"","\\"Microsoft Defender for Office 365\\""],"\\"ServiceKeywords\\"":["\\"Exchange\\"","\\"Teams\\"","\\"SharePoint\\"","\\"OneDrive\\"","\\"Microsoft 365\\"","\\"Outlook\\"","\\"Office on the web\\"","\\"Defender for Office 365\\"","\\"Viva\\""]}"""'.replace('"""', '{[DQ]}').replace('{[DQ]}', '\"')

old2 = 'MetadataJson = """{"ServiceKeywords":["Power Platform","Power Apps","Power Automate","Power Pages","Copilot Studio","Dataverse","Dynamics 365","Customer Service","Field Service","Sales"]}""",'
new2 = 'MetadataJson = "{\\"ServiceKeywords\\"":["\\"Power Platform\\"","\\"Power Apps\\"","\\"Power Automate\\"","\\"Power Pages\\"","\\"Copilot Studio\\"","\\"Dataverse\\"","\\"Dynamics 365\\"","\\"Customer Service\\"","\\"Field Service\\"","\\"Sales\\""]}"""'.replace('"""', '{[DQ]}').replace('{[DQ]}', '\"')

if old1 in content:
    content = content.replace(old1, new1)
    print('Replaced M365 MetadataJson')
else:
    print('M365 pattern not found')

if old2 in content:
    content = content.replace(old2, new2)
    print('Replaced Power Platform MetadataJson')
else:
    print('Power Platform pattern not found')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print('Done')
