# Batch Counter Integration Setup Guide

This guide will help you integrate your industrial batch counter with the dashboard to receive real-time production data.

## Overview

Your batch counter will send data via WiFi to a permanent URL endpoint. The data will be stored in Supabase and displayed in real-time on your dashboard.

## Permanent IP Address / URL

### Complete Endpoint Details

**Full URL:**
```
https://orsdqaeqqobltrmpvtmj.supabase.co/functions/v1/receive-batch-data
```

**Protocol:** HTTPS (required - HTTP is not supported)

**Port:** 443 (default HTTPS port - usually doesn't need to be specified)

**Host:** `orsdqaeqqobltrmpvtmj.supabase.co`

**Path:** `/functions/v1/receive-batch-data`

**Method:** POST

**Content-Type:** `application/json`

### For Batch Counter Configuration

If your batch counter requires separate fields, use:

- **Server/Host:** `orsdqaeqqobltrmpvtmj.supabase.co`
- **Port:** `443` (or leave blank if it auto-detects HTTPS)
- **Path/Endpoint:** `/functions/v1/receive-batch-data`
- **Protocol:** HTTPS (required)
- **Method:** POST
- **Content-Type:** `application/json`

### Alternative: Using IP Address (Not Recommended)

If your batch counter **only** accepts IP addresses and cannot use URLs:

1. **Get the IP address:**
   ```bash
   nslookup orsdqaeqqobltrmpvtmj.supabase.co
   ```
   Or use online tools like: https://www.nslookup.io/

2. **Configure:**
   - **IP Address:** (Use the IP from nslookup - may change)
   - **Port:** `443`
   - **Path:** `/functions/v1/receive-batch-data`
   - **Protocol:** HTTPS

**⚠️ Warning:** IP addresses can change. Using the URL (hostname) is strongly recommended as it's permanent and more reliable.

### Complete Request Example

**Full HTTP Request:**
```http
POST /functions/v1/receive-batch-data HTTP/1.1
Host: orsdqaeqqobltrmpvtmj.supabase.co
Port: 443
Content-Type: application/json
Content-Length: 123

{
  "machine_id": "MACHINE-001",
  "batch_count": 1250,
  "production_rate": 150.5,
  "status": "running"
}
```

**cURL Command:**
```bash
curl -X POST https://orsdqaeqqobltrmpvtmj.supabase.co/functions/v1/receive-batch-data \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": "MACHINE-001",
    "batch_count": 1250,
    "production_rate": 150.5,
    "status": "running"
  }'
```

**Important:** This URL is permanent and will not change. Configure this URL in your batch counter's WiFi settings.

## Step 1: Set Up Database Table

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `CREATE_BATCH_COUNTER_TABLE.sql`:

```sql
-- Copy and paste the entire contents of CREATE_BATCH_COUNTER_TABLE.sql
```

This will create:
- `batch_counter_data` table to store all readings
- `batch_counter_stats_last_hour` view for quick statistics
- Required indexes and security policies

## Step 2: Deploy Supabase Edge Function

The Edge Function receives data from your batch counter. You have two options:

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref orsdqaeqqobltrmpvtmj
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy receive-batch-data
   ```

### Option B: Manual Deployment via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** section
3. Click **Create Function**
4. Name it: `receive-batch-data`
5. Copy the code from `supabase/functions/receive-batch-data/index.ts`
6. Deploy the function

## Step 3: Configure Your Batch Counter

Configure your industrial batch counter to send data to the endpoint URL.

### Endpoint Configuration:
- **URL:** `https://orsdqaeqqobltrmpvtmj.supabase.co/functions/v1/receive-batch-data`
- **Method:** `POST`
- **Content-Type:** `application/json`

### Data Format

Your batch counter should send JSON data in the following format:

```json
{
  "machine_id": "MACHINE-001",
  "batch_count": 1250,
  "production_rate": 150.5,
  "status": "running",
  "metadata": {
    "temperature": 25.5,
    "pressure": 1.2,
    "any_other_field": "value"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Required Fields:
- `machine_id` (string): Unique identifier for your machine (e.g., "MACHINE-001")
- `batch_count` (integer): Current batch count

### Optional Fields:
- `production_rate` (number): Items per hour
- `status` (string): Machine status - "running", "stopped", "error", etc.
- `metadata` (object): Any additional data you want to store
- `timestamp` (string): ISO 8601 timestamp (if not provided, server time will be used)

### Example HTTP Request

```http
POST https://orsdqaeqqobltrmpvtmj.supabase.co/functions/v1/receive-batch-data HTTP/1.1
Content-Type: application/json

{
  "machine_id": "MACHINE-001",
  "batch_count": 1250,
  "production_rate": 150.5,
  "status": "running"
}
```

## Step 4: Test the Integration

### Test Using cURL

```bash
curl -X POST https://orsdqaeqqobltrmpvtmj.supabase.co/functions/v1/receive-batch-data \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": "TEST-MACHINE",
    "batch_count": 100,
    "production_rate": 50.0,
    "status": "running"
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Batch data received successfully",
  "data": {
    "id": "uuid-here",
    "machine_id": "TEST-MACHINE",
    "batch_count": 100,
    ...
  }
}
```

## Step 5: View Data in Dashboard

1. Open your application dashboard
2. Navigate to the **Batch Counter** tab
3. You should see real-time data from your batch counter

The dashboard will automatically:
- Display current batch count
- Show production rate
- Display machine status
- Show trend charts
- Update every 5 seconds

## Troubleshooting

### Batch Counter Cannot Connect

1. **Check WiFi Connection:** Ensure your batch counter is connected to WiFi
2. **Verify URL:** Double-check the endpoint URL is correct
3. **Check Firewall:** Ensure your network allows outbound HTTPS connections
4. **Test with cURL:** Use the test command above to verify connectivity

### Data Not Appearing in Dashboard

1. **Check Supabase Table:** Go to Supabase dashboard → Table Editor → `batch_counter_data`
2. **Verify Edge Function:** Check Edge Functions logs in Supabase dashboard
3. **Check Browser Console:** Open browser developer tools and check for errors
4. **Verify Machine ID:** Ensure you're viewing the correct machine in the dashboard

### Edge Function Errors

1. Go to Supabase Dashboard → Edge Functions → `receive-batch-data` → Logs
2. Check for error messages
3. Verify environment variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Security Considerations

### API Key Protection

The Edge Function uses Supabase Service Role Key for database access. This key is:
- Stored securely in Supabase environment variables
- Never exposed to the client
- Only accessible server-side

### Rate Limiting

Consider implementing rate limiting if your batch counter sends data very frequently (e.g., every second). You can:
- Add rate limiting in the Edge Function
- Configure batch counter to send data less frequently
- Use Supabase's built-in rate limiting features

## Advanced Configuration

### Multiple Machines

If you have multiple batch counters:
- Use different `machine_id` values for each machine
- The dashboard will show a dropdown to select which machine to view
- All machines' data is stored in the same table

### Custom Metadata

You can store any additional data in the `metadata` field:

```json
{
  "machine_id": "MACHINE-001",
  "batch_count": 1250,
  "metadata": {
    "operator": "John Doe",
    "shift": "Morning",
    "product_type": "Widget A",
    "quality_score": 98.5
  }
}
```

### Historical Data

All data is stored permanently in Supabase. You can:
- Query historical data using the API functions in `batch-counter-storage.ts`
- Export data for analysis
- Create custom reports

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify your batch counter configuration
3. Test the endpoint using cURL
4. Check the browser console for frontend errors

## IP Address Information

**Important:** The endpoint URL uses HTTPS, not a raw IP address. This is better because:
- ✅ Works with dynamic IP addresses
- ✅ Includes SSL encryption
- ✅ More reliable than IP addresses
- ✅ Easier to configure

If your batch counter specifically requires an IP address instead of a URL, you can:
1. Use a DNS lookup service to get the IP: `nslookup orsdqaeqqobltrmpvtmj.supabase.co`
2. Note: IP addresses may change, so URL is recommended

However, most modern batch counters support HTTPS URLs, which is the recommended approach.

