import type { GlobalConfig } from 'payload'

import { hasAdminPanelAccess } from '../collections/users/access'

export const TicketConfig: GlobalConfig = {
  slug: 'ticketConfig',
  label: 'Ticket Config',
  admin: {
    group: 'Configurazione',
  },
  access: {
    read: ({ req: { user } }) => hasAdminPanelAccess(user),
    update: ({ req: { user } }) => hasAdminPanelAccess(user),
  },
  fields: [
    {
      name: 'locationEvento',
      type: 'text',
      label: 'Location evento',
      admin: {
        description: 'Testo mostrato sul biglietto (email e pagina pubblica).',
      },
    },
    {
      name: 'scadenzaBiglietto',
      type: 'date',
      label: 'Scadenza pagina pubblica biglietto',
      required: false,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Solo la pagina pubblica del biglietto smette di mostrare i dati dopo questa data/ora — il check-in in ingresso non è influenzato e resta valido fino al Reset GDPR.',
      },
    },
    {
      name: 'qrContentModeDefault',
      type: 'select',
      label: 'Modalità contenuto QR (default)',
      defaultValue: 'token',
      options: [
        { label: 'Token', value: 'token' },
        { label: 'Full data', value: 'fullData' },
      ],
      admin: {
        description:
          'Valore applicato ai nuovi contatti (e al backfill) se qrContentMode non è ancora valorizzato.',
      },
    },
    {
      name: 'pianoResendPro',
      type: 'checkbox',
      label: 'Piano Resend Pro attivo',
      defaultValue: false,
      admin: {
        description:
          'Attivare dopo l’upgrade del piano Resend a Pro, prima di eseguire l’invio massivo. Non riguarda gli invii singoli (Wildcard/resend).',
      },
    },
    {
      name: 'modalitaTestInvio',
      type: 'checkbox',
      label: 'Modalità test invio',
      defaultValue: true,
      admin: {
        description:
          'Se attiva, le email ticket partono solo verso gli indirizzi in Contatti di test. Default: attiva (sistema protetto). Disattivare solo quando si è pronti a comunicare con invitati reali.',
      },
    },
    {
      name: 'contattiTest',
      type: 'array',
      label: 'Contatti di test',
      labels: {
        singular: 'Email di test',
        plural: 'Contatti di test',
      },
      admin: {
        description:
          'Whitelist usata solo con Modalità test invio attiva. Inserire esclusivamente indirizzi di test del team — mai email di invitati reali. Se la lista è vuota e la modalità test è attiva, nessuna email parte.',
      },
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
          label: 'Email',
        },
      ],
    },
    {
      name: 'invioTicketInProgress',
      type: 'checkbox',
      label: 'Invio ticket massivo in corso',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Lock applicativo — gestito dal codice di invio massivo (Passo 6+).',
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'invioTicketStartedAt',
      type: 'date',
      label: 'Invio massivo avviato il',
      admin: {
        readOnly: true,
        description: 'Timestamp di avvio — per riconoscere un lock morto (stessa soglia del sync HubSpot).',
        date: { pickerAppearance: 'dayAndTime' },
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'invioTicketProgressProcessed',
      type: 'number',
      label: 'Invio — contatti elaborati',
      admin: {
        readOnly: true,
        description: 'Avanzamento invio massivo — gestito dal codice.',
        condition: (data) => Boolean(data?.invioTicketInProgress),
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'invioTicketProgressTotal',
      type: 'number',
      label: 'Invio — totale perimetro',
      admin: {
        readOnly: true,
        description: 'Totale contatti nel perimetro dell’invio in corso.',
        condition: (data) => Boolean(data?.invioTicketInProgress),
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'invioTicketProgressPhase',
      type: 'text',
      label: 'Invio — fase',
      admin: {
        readOnly: true,
        description: 'Fase testuale dell’invio massivo (es. invio | report).',
        condition: (data) => Boolean(data?.invioTicketInProgress),
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'invioMassivoButton',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/InvioTicketMassivoButton',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, context }) => {
        if (!data) return data

        // Il codice di invio massivo scrive lock/progress via Local API con context dedicato.
        if (context?.ticketInvioLockUpdate) return data

        return {
          ...data,
          invioTicketInProgress: originalDoc?.invioTicketInProgress ?? false,
          invioTicketStartedAt: originalDoc?.invioTicketStartedAt ?? null,
          invioTicketProgressProcessed: originalDoc?.invioTicketProgressProcessed ?? null,
          invioTicketProgressTotal: originalDoc?.invioTicketProgressTotal ?? null,
          invioTicketProgressPhase: originalDoc?.invioTicketProgressPhase ?? null,
        }
      },
    ],
  },
}
