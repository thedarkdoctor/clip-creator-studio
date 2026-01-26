import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload as UploadIcon, File, X, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateVideo } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';


const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function Upload() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const createVideo = useCreateVideo();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      simulateUpload();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleGenerate = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    try {
      // Create video record in database (metadata only - no actual storage for MVP)
      console.log('[Upload] Creating video record', { fileName: file.name, size: file.size });

      const video = await createVideo.mutateAsync({
        fileName: file.name,
      });
      
      console.log('[Upload] Video record created', { videoId: video.id });
      
      // Store video ID for processing page
      sessionStorage.setItem('currentVideoId', video.id);
      
      navigate('/processing');
    } catch (error: any) {
      console.error('[Upload] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create video. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const isReady = file && uploadProgress >= 100;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/trends')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-2xl">
        <ProgressSteps steps={steps} currentStep={2} />

        <div className="glass-card rounded-2xl p-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Upload Your Content</h1>
          <p className="text-muted-foreground mb-8">
            Upload a long-form video and we'll transform it into engaging short-form clips.
          </p>

          {/* Upload Area */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <UploadIcon size={28} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Drop your video here or click to upload
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Supports MP4, MOV, AVI up to 2GB
              </p>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-xl p-6 bg-secondary/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <File size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-[300px]">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile} disabled={isProcessing}>
                  <X size={18} />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isUploading ? 'Uploading...' : 'Upload complete'}
                  </span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    {uploadProgress >= 100 ? (
                      <>
                        <CheckCircle2 size={14} />
                        Ready
                      </>
                    ) : (
                      `${Math.min(Math.round(uploadProgress), 100)}%`
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-medium">How it works:</span> Our AI will analyze 
              your video, identify the best moments, and create multiple short clips optimized 
              for each platform you selected.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-end">
            <Button
              variant="gradient"
              size="lg"
              disabled={!isReady || isProcessing}
              onClick={handleGenerate}
              className="group"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Sparkles className="group-hover:rotate-12 transition-transform" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
