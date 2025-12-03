// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

async function verifyApi() {
    const payload = {
        month: 11,
        year: 2025,
        user_id: 10
    };

    console.log('Testing API with payload:', payload);

    try {
        const response = await fetch('https://xtdz-pj2k-avay.a2.xano.io/api:9A1JJPSy/calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Failed to fetch calendar data:', response.statusText);
            return;
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));

        // Verify color coding logic
        if (data && Array.isArray(data.return)) {
            console.log('\nVerifying Color Coding Logic:');
            data.return.forEach(item => {
                let color = 'None Date Colour';
                if (item.count >= 3) {
                    color = 'Lots Date Colour';
                } else if (item.count >= 1) {
                    color = 'Some Date Colour';
                }
                console.log(`Date: ${item.date}, Count: ${item.count}, Expected Color: ${color}`);
            });
        }

    } catch (error) {
        console.error('Error fetching calendar data:', error);
    }
}

verifyApi();
