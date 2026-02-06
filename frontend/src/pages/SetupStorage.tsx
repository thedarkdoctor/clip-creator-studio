import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SetupStorage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'creating' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (log: string) => {
    console.log(`[StorageSetup] ${log}`);
    setLogs(prev => [...prev, log]);
  };

  useEffect(() => {
    checkAndCreateBucket();
  }, []);

  const checkAndCreateBucket = async () => {
    try {
      addLog('🔍 Checking if videos bucket exists...');
      setStatus('checking');

      // Try to list buckets
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        addLog(`❌ Error listing buckets: ${listError.message}`);
      } else {
        addLog(`✅ Found ${buckets?.length || 0} bucket(s)`);
        buckets?.forEach(b => addLog(`  - ${b.name} (${b.public ? 'public' : 'private'})`));
      }

      // Check if videos bucket exists
      const videosBucket = buckets?.find(b => b.id === 'videos' || b.name === 'videos');
      
      if (videosBucket) {
        addLog('✅ Videos bucket already exists!');
        setMessage('Storage bucket already configured');
        setStatus('success');
        return;
      }

      addLog('⚠️ Videos bucket not found. Creating it now...');
      setStatus('creating');

      // Try to create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('videos', {
        public: true,
        fileSizeLimit: 2147483648, // 2GB
        allowedMimeTypes: [
          'video/mp4',
          'video/quicktime', 
          'video/x-msvideo',
          'video/webm',
          'image/jpeg',
          'image/png'
        ]
      });

      if (createError) {
        addLog(`❌ Failed to create bucket: ${createError.message}`);
        
        // Check if it's a permissions error
        if (createError.message.includes('permission') || createError.message.includes('not authorized')) {
          setMessage('Cannot create bucket - insufficient permissions. Using Lovable workaround...');
          setStatus('error');
          addLog('📋 This requires Lovable team to create the bucket in their Supabase instance.');
          addLog('🔧 WORKAROUND: The app will continue but video uploads may fail until bucket is created.');
        } else {
          throw createError;
        }
        return;
      }

      addLog('✅ Bucket created successfully!');
      addLog('🎉 Storage is now configured and ready to use');
      setMessage('Storage bucket created successfully!');
      setStatus('success');

    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setMessage(error.message || 'Failed to setup storage');
      setStatus('error');
    }
  };

  return (
    <div className=\"min-h-screen flex flex-col bg-background\">
      <header className=\"border-b border-border px-6 py-4\">
        <div className=\"container mx-auto flex items-center justify-between\">
          <div className=\"flex items-center gap-2\">
            <Database className=\"text-primary\" size={24} />
            <h1 className=\"text-xl font-bold\">Storage Setup</h1>
          </div>
          <Button variant=\"ghost\" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </header>

      <main className=\"flex-1 container mx-auto px-6 py-12 max-w-4xl\">
        <div className=\"glass-card rounded-2xl p-8\">
          <div className=\"text-center mb-8\">
            <div className=\"w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center\">
              {status === 'checking' && <Loader2 className=\"text-primary animate-spin\" size={32} />}
              {status === 'creating' && <Loader2 className=\"text-primary animate-spin\" size={32} />}
              {status === 'success' && <CheckCircle2 className=\"text-green-500\" size={32} />}
              {status === 'error' && <AlertCircle className=\"text-destructive\" size={32} />}
            </div>
            <h2 className=\"text-2xl font-bold mb-2\">
              {status === 'checking' && 'Checking Storage Configuration...'}
              {status === 'creating' && 'Creating Storage Bucket...'}
              {status === 'success' && 'Storage Configured Successfully!'}
              {status === 'error' && 'Configuration Issue'}
            </h2>
            <p className=\"text-muted-foreground\">
              {message}
            </p>
          </div>

          {/* Logs */}
          <div className=\"bg-secondary/30 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto\">
            <div className=\"font-mono text-sm space-y-1\">
              {logs.map((log, i) => (
                <div key={i} className=\"text-muted-foreground\">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className=\"text-muted-foreground\">Initializing...</div>
              )}
            </div>
          </div>

          {/* Status messages */}
          {status === 'error' && (
            <Alert className=\"mb-6 border-destructive/50\">
              <AlertCircle className=\"h-4 w-4\" />
              <AlertDescription>
                <strong>Unable to create storage bucket automatically.</strong>
                <br /><br />
                Since you're using Lovable, you'll need to:
                <ol className=\"list-decimal ml-5 mt-2 space-y-1\">
                  <li>Contact Lovable support or check your project settings</li>
                  <li>Request them to create a bucket named \"videos\" with public access</li>
                  <li>Or use Lovable's built-in storage management tools</li>
                </ol>
                <br />
                <strong>Temporary Workaround:</strong> The app will continue to function but video uploads will fail until the bucket is created.
              </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className=\"mb-6 border-green-500/50 bg-green-500/10\">
              <CheckCircle2 className=\"h-4 w-4 text-green-500\" />
              <AlertDescription>
                <strong className=\"text-green-500\">Storage is ready!</strong>
                <br />
                You can now upload videos and use all content generation features.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className=\"flex gap-3 justify-center\">
            {status === 'error' && (
              <Button onClick={checkAndCreateBucket}>
                Retry Setup
              </Button>
            )}
            {status === 'success' && (
              <Button variant=\"gradient\" onClick={() => navigate('/upload')}>
                Start Creating Content
              </Button>
            )}
            <Button variant=\"outline\" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </div>
        </div>

        {/* Help Section */}
        <div className=\"mt-8 glass-card rounded-xl p-6\">
          <h3 className=\"font-semibold mb-3\">About Storage Setup</h3>
          <div className=\"text-sm text-muted-foreground space-y-2\">
            <p>
              This page attempts to create the required \"videos\" storage bucket for your app.
            </p>
            <p>
              <strong>What it does:</strong> Creates a public bucket named \"videos\" with a 2GB size limit to store uploaded videos and generated clips.
            </p>
            <p>
              <strong>Lovable Projects:</strong> If you see permission errors, this is because Lovable manages your Supabase instance. You may need to use Lovable's project settings or contact their support.
            </p>
            <p>
              <strong>Need Help?</strong> Check the browser console (F12) for detailed logs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
