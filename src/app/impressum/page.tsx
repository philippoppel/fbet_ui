// src/app/impressum/page.tsx (oder src/pages/impressum.tsx)

export default function ImpressumPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6'>Impressum</h1>

      <h2 className='text-2xl font-semibold mb-3'>Angaben gemäß § 5 TMG</h2>
      <p className='mb-2'>
        Max Mustermann (oder Name deines Unternehmens/Projekts)
        <br />
        Musterstraße 123
        <br />
        12345 Musterstadt
        <br />
        Deutschland
      </p>

      <h2 className='text-2xl font-semibold mb-3 mt-6'>Kontakt</h2>
      <p className='mb-2'>
        Telefon: +49 (0) 123 4567890 (Optional, wenn vorhanden)
        <br />
        E-Mail: deine-email@example.com
      </p>

      {/* Optional: Vertretungsberechtigte Person(en) */}
      {/*
      <h2 className="text-2xl font-semibold mb-3 mt-6">Vertreten durch</h2>
      <p className="mb-2">
        Max Mustermann (falls abweichend oder bei juristischen Personen)
      </p>
      */}

      {/* Optional: Umsatzsteuer-ID */}
      {/*
      <h2 className="text-2xl font-semibold mb-3 mt-6">Umsatzsteuer-ID</h2>
      <p className="mb-2">
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
        <br />
        DE123456789 (Beispiel)
      </p>
      */}

      {/* Optional: Registernummer / Aufsichtsbehörde (je nach Art deines Angebots) */}
      {/*
      <h2 className="text-2xl font-semibold mb-3 mt-6">Registereintrag</h2>
      <p className="mb-2">
        Eintragung im Handelsregister.
        <br />
        Registergericht: Amtsgericht Musterstadt
        <br />
        Registernummer: HRB 12345
      </p>
      <h2 className="text-2xl font-semibold mb-3 mt-6">Aufsichtsbehörde</h2>
      <p className="mb-2">
        Name und Anschrift der zuständigen Aufsichtsbehörde (falls zutreffend, z.B. bei Glücksspiel)
      </p>
      */}

      <h2 className='text-2xl font-semibold mb-3 mt-6'>
        Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
      </h2>
      <p className='mb-2'>
        Max Mustermann
        <br />
        Anschrift wie oben
      </p>

      <h2 className='text-2xl font-semibold mb-3 mt-6'>
        Haftungsausschluss (Disclaimer)
      </h2>
      <h3 className='text-xl font-semibold mb-2 mt-4'>Haftung für Inhalte</h3>
      <p className='mb-4'>
        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8
        bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder
        nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
        hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
        Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von
        entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
        entfernen.
      </p>
      {/* Weitere Abschnitte für Haftung für Links, Urheberrecht etc. hinzufügen */}

      <h3 className='text-xl font-semibold mb-2 mt-4'>Urheberrecht</h3>
      <p className='mb-4'>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
        Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
        jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
        sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
        Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden,
        werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
        Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
        Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
        entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden
        wir derartige Inhalte umgehend entfernen.
      </p>

      {/* Hinweis: Impressum-Generatoren können helfen, spezifische Anforderungen abzudecken. */}
      <p className='mt-8 text-sm text-gray-600'>
        Dieses Impressum wurde beispielhaft erstellt. Bitte passen Sie es an
        Ihre spezifischen Anforderungen an und ziehen Sie ggf. Rechtsberatung
        hinzu.
      </p>
    </div>
  );
}
