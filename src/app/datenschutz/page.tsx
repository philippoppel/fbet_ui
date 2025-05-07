// src/app/datenschutz/page.tsx (oder src/pages/datenschutz.tsx)

export default function DatenschutzPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6'>Datenschutzerklärung</h1>

      <h2 className='text-2xl font-semibold mb-3'>
        1. Datenschutz auf einen Blick
      </h2>
      <h3 className='text-xl font-semibold mb-2 mt-4'>Allgemeine Hinweise</h3>
      <p className='mb-4'>
        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
        Ihren personenbezogenen Daten passiert, wenn Sie unsere Website
        besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
        persönlich identifiziert werden können. Ausführliche Informationen zum
        Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
        Datenschutzerklärung.
      </p>
      {/* Weitere allgemeine Hinweise hier einfügen */}

      <h2 className='text-2xl font-semibold mb-3 mt-6'>
        2. Allgemeine Hinweise und Pflichtinformationen
      </h2>
      <h3 className='text-xl font-semibold mb-2 mt-4'>Datenschutz</h3>
      <p className='mb-4'>
        Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten
        sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und
        entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser
        Datenschutzerklärung.
        <br />
        Wenn Sie diese Website benutzen, werden verschiedene personenbezogene
        Daten erhoben. Die vorliegende Datenschutzerklärung erläutert, welche
        Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und
        zu welchem Zweck das geschieht.
        <br />
        Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei
        der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein
        lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht
        möglich.
      </p>
      <h3 className='text-xl font-semibold mb-2 mt-4'>
        Hinweis zur verantwortlichen Stelle
      </h3>
      <p className='mb-4'>
        Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website
        ist:
        <br />
        Max Mustermann (oder Name deines Unternehmens/Projekts)
        <br />
        Musterstraße 123
        <br />
        12345 Musterstadt
        <br />
        E-Mail: deine-email@example.com
        <br />
        {/* Ggf. Telefon hinzufügen */}
        <br />
        Verantwortliche Stelle ist die natürliche oder juristische Person, die
        allein oder gemeinsam mit anderen über die Zwecke und Mittel der
        Verarbeitung von personenbezogenen Daten (z. B. Namen, E-Mail-Adressen
        o. Ä.) entscheidet.
      </p>
      {/* Weitere Abschnitte sind zwingend erforderlich, z.B.:
          - Widerruf Ihrer Einwilligung zur Datenverarbeitung
          - Beschwerderecht bei der zuständigen Aufsichtsbehörde
          - Recht auf Datenübertragbarkeit
          - Auskunft, Sperrung, Löschung
          - SSL- bzw. TLS-Verschlüsselung
          - Datenerfassung auf unserer Website (Cookies, Server-Log-Dateien, Kontaktformular etc.)
          - Analyse-Tools und Werbung (z.B. Google Analytics, falls verwendet)
          - Newsletterdaten (falls vorhanden)
          - Plugins und Tools (z.B. Google Web Fonts, Google Maps, falls verwendet)
      */}

      <h2 className='text-2xl font-semibold mb-3 mt-6'>
        3. Datenerfassung auf unserer Website
      </h2>
      <h3 className='text-xl font-semibold mb-2 mt-4'>Cookies</h3>
      <p className='mb-4'>
        Unsere Internetseiten verwenden teilweise so genannte Cookies. Cookies
        richten auf Ihrem Rechner keinen Schaden an und enthalten keine Viren.
        Cookies dienen dazu, unser Angebot nutzerfreundlicher, effektiver und
        sicherer zu machen. Cookies sind kleine Textdateien, die auf Ihrem
        Rechner abgelegt werden und die Ihr Browser speichert.
        {/* Erläutere welche Arten von Cookies du nutzt und wofür, und wie Nutzer widersprechen können */}
      </p>

      <h3 className='text-xl font-semibold mb-2 mt-4'>Server-Log-Dateien</h3>
      <p className='mb-4'>
        Der Provider der Seiten erhebt und speichert automatisch Informationen
        in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns
        übermittelt. Dies sind:
      </p>
      <ul className='list-disc list-inside mb-4'>
        <li>Browsertyp und Browserversion</li>
        <li>verwendetes Betriebssystem</li>
        <li>Referrer URL</li>
        <li>Hostname des zugreifenden Rechners</li>
        <li>Uhrzeit der Serveranfrage</li>
        <li>IP-Adresse</li>
      </ul>
      <p className='mb-4'>
        Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht
        vorgenommen. Grundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit.
        f DSGVO, der die Verarbeitung von Daten zur Erfüllung eines Vertrags
        oder vorvertraglicher Maßnahmen gestattet.
      </p>
      {/* ... Weitere spezifische Abschnitte für deine genutzten Dienste ... */}

      <p className='mt-8 text-sm text-gray-600'>
        Diese Datenschutzerklärung wurde beispielhaft erstellt und muss
        umfassend an Ihre spezifischen Datenverarbeitungsvorgänge angepasst
        werden. Bitte ziehen Sie ggf. Rechtsberatung oder
        Datenschutz-Generatoren hinzu, um die Einhaltung der DSGVO und anderer
        relevanter Gesetze sicherzustellen.
      </p>
    </div>
  );
}
