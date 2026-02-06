 // src/components/ContentGenerationButton.tsx
 /**
  * Content Generation Button Component
  * Triggers the full content generation pipeline with progress feedback
  */
 
 import { useState } from 'react';
 import { Sparkles, Loader2, AlertCircle, Check, Wand2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { useContentGeneration, useContentContext } from '@/hooks/useContentGeneration';
 
 interface ContentGenerationButtonProps {
   maxTrends?: number;
   variant?: 'default' | 'outline' | 'secondary';
   size?: 'default' | 'sm' | 'lg';
   className?: string;
   showProgress?: boolean;
 }
 
 export function ContentGenerationButton({
   maxTrends = 5,
   variant = 'default',
   size = 'default',
   className = '',
   showProgress = true,
 }: ContentGenerationButtonProps) {
   const { isComplete, missingFields } = useContentContext();
   const { isGenerating, progress, generateContent, results } = useContentGeneration({
     maxTrends,
   });
   
   const [showError, setShowError] = useState(false);
   
   const handleClick = async () => {
     if (!isComplete) {
       setShowError(true);
       return;
     }
     
     setShowError(false);
     await generateContent();
   };
   
   // Calculate progress percentage
   const progressPercent = progress
     ? Math.round((progress.current / progress.total) * 100)
     : 0;
   
   // Determine button state
   const getButtonContent = () => {
     if (isGenerating) {
       return (
         <>
           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           {progress?.message || 'Generating...'}
         </>
       );
     }
     
     if (results && results.length > 0) {
       const successful = results.filter(r => r.success).length;
       return (
         <>
           <Check className="mr-2 h-4 w-4" />
           {successful} Videos Ready
         </>
       );
     }
     
     return (
       <>
         <Wand2 className="mr-2 h-4 w-4" />
         Generate Content
       </>
     );
   };
   
   return (
     <div className={`space-y-3 ${className}`}>
       {/* Error Alert */}
       {showError && !isComplete && (
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>
             Business profile incomplete. Missing: {missingFields.join(', ')}.
             Please update settings in Lynkscope.
           </AlertDescription>
         </Alert>
       )}
       
       {/* Generate Button */}
       <Button
         variant={variant}
         size={size}
         onClick={handleClick}
         disabled={isGenerating}
         className="w-full"
       >
         {getButtonContent()}
       </Button>
       
       {/* Progress Bar */}
       {showProgress && isGenerating && progress && (
         <div className="space-y-2">
           <Progress value={progressPercent} className="h-2" />
           <p className="text-xs text-muted-foreground text-center">
             Stage: {progress.stage} ({progress.current}/{progress.total})
           </p>
         </div>
       )}
     </div>
   );
 }
 
 /**
  * Compact version for toolbar/header use
  */
 export function ContentGenerationButtonCompact({
   maxTrends = 3,
 }: {
   maxTrends?: number;
 }) {
   const { isComplete } = useContentContext();
   const { isGenerating, generateContent } = useContentGeneration({ maxTrends });
   
   return (
     <Button
       variant="outline"
       size="sm"
       onClick={() => generateContent()}
       disabled={isGenerating || !isComplete}
     >
       {isGenerating ? (
         <Loader2 className="h-4 w-4 animate-spin" />
       ) : (
         <Sparkles className="h-4 w-4" />
       )}
       <span className="ml-2 hidden sm:inline">
         {isGenerating ? 'Generating...' : 'Generate'}
       </span>
     </Button>
   );
 }