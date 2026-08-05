'use client'

import { Button } from '@payloadcms/ui'

export default function HubspotSyncNowButton() {
  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
      <Button
        buttonStyle="primary"
        onClick={() => {
          window.alert('Sync non ancora implementato (Passo 3).')
        }}
        type="button"
      >
        Sincronizza ora
      </Button>
      <p className="field-description" style={{ marginTop: '0.5rem' }}>
        Placeholder — la logica di sync HubSpot sarà collegata nel Passo 3.
      </p>
    </div>
  )
}
