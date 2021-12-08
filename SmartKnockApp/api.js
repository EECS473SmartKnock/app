import { API_URL } from './config';

export async function getStats(lockId) {
    const res = await fetch(API_URL + '/stats/' + lockId);
    const stats = await res.json();
    return {
        battery: stats.battery,
        knocks: stats.knocks,
        time_updated: stats.time_updated
    }
}

export async function lock(lockId, passphrase) {
    // POST /messages/:id?type=LOCK&passphrase=<passphrase>
    // Parameters are URL encoded
    const res = await fetch(API_URL + '/messages/' + lockId + '?type=LOCK&passphrase=' + passphrase, {
        method: 'POST',
    });
    const message = await res.text();
    return message;
}

export async function unlock(lockId, passphrase) {
    // POST /messages/:id?type=UNLOCK&passphrase=<passphrase>
    // Parameters are URL encoded
    const res = await fetch(API_URL + '/messages/' + lockId + '?type=UNLOCK&passphrase=' + passphrase, {
        method: 'POST',
    });
    const message = await res.text();
    return message;
}