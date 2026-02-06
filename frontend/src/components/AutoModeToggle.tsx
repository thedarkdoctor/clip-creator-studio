 // src/components/AutoModeToggle.tsx
 /**
  * Auto Mode Toggle Component
  * Enables/disables automatic content generation based on triggers
  */
 
 import { useEffect, useState, useCallback } from 'react';
 import { Zap, ZapOff } from 'lucide-react';
 import { Switch } from '@/components/ui/switch';
 import { Label } from '@/components/ui/label';
 import { useAuth } from '@/contexts/AuthContext';
 import { useContentGeneration } from '@/hooks/useContentGeneration';
 import { toast } from 'sonner';
 
 interface AutoModeToggleProps {
   onToggle?: (enabled: boolean) => void;
 }
 
 export function AutoModeToggle({ onToggle }: AutoModeToggleProps) {
   const { userId, businessName, niche } = useAuth();
   const [autoModeEnabled, setAutoModeEnabled] = useState(false);
   
   const { checkAutoTrigger, generateContent, isGenerating, isProfileComplete } = useContentGeneration({
     autoMode: autoModeEnabled,
     maxTrends: 3,
   });
   
   // Check for auto triggers periodically
   useEffect(() => {
     if (!autoModeEnabled || !isProfileComplete) return;
     
     const checkTriggers = async () => {
       const shouldTrigger = await checkAutoTrigger();
       if (shouldTrigger && !isGenerating) {
         console.log('[AutoMode] Triggering automatic content generation');
         toast.info('Auto Mode: Starting content generation...');
         await generateContent();
       }
     };
     
     // Check every 30 minutes
     const interval = setInterval(checkTriggers, 30 * 60 * 1000);
     
     // Initial check after 5 seconds
     const initialCheck = setTimeout(checkTriggers, 5000);
     
     return () => {
       clearInterval(interval);
       clearTimeout(initialCheck);
     };
   }, [autoModeEnabled, isProfileComplete, checkAutoTrigger, generateContent, isGenerating]);
   
   const handleToggle = useCallback((checked: boolean) => {
     if (checked && !isProfileComplete) {
       toast.error('Complete your business profile in Lynkscope to enable Auto Mode');
       return;
     }
     
     setAutoModeEnabled(checked);
     onToggle?.(checked);
     
     if (checked) {
       toast.success('Auto Mode enabled - content will generate automatically');
     } else {
       toast.info('Auto Mode disabled');
     }
   }, [isProfileComplete, onToggle]);
   
   return (
     <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
       <div className="flex-shrink-0">
         {autoModeEnabled ? (
           <Zap className="h-5 w-5 text-primary" />
         ) : (
           <ZapOff className="h-5 w-5 text-muted-foreground" />
         )}
       </div>
       
       <div className="flex-grow">
         <Label htmlFor="auto-mode" className="text-sm font-medium">
           Auto Mode
         </Label>
         <p className="text-xs text-muted-foreground">
           Automatically generate content when new trends or intel arrives
         </p>
       </div>
       
       <Switch
         id="auto-mode"
         checked={autoModeEnabled}
         onCheckedChange={handleToggle}
         disabled={!isProfileComplete}
       />
     </div>
   );
 }