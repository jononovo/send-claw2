import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

export type ProfileType = 'sender' | 'product' | 'customer';

interface ProfileField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'url';
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  helpText?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: ProfileType;
  profile?: any;
  onSuccess?: () => void;
}

// Configuration for different profile types
const profileConfigs: Record<ProfileType, {
  title: string;
  fields: ProfileField[];
  apiEndpoint: string;
  queryKey: string[];
}> = {
  sender: {
    title: 'Sender Profile',
    apiEndpoint: '/api/sender-profiles',
    queryKey: ['/api/sender-profiles'],
    fields: [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'John'
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Doe'
      },
      {
        name: 'displayName',
        label: 'Display Name',
        type: 'text',
        placeholder: 'John Doe (auto-generated if empty)',
        helpText: 'This is how your name will appear in the dropdown'
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'john.doe@company.com'
      },
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        placeholder: 'Dr., Mr., Ms.'
      },
      {
        name: 'companyPosition',
        label: 'Position',
        type: 'text',
        placeholder: 'Sales Manager'
      },
      {
        name: 'companyName',
        label: 'Company Name',
        type: 'text',
        placeholder: 'Acme Corp'
      },
      {
        name: 'companyWebsite',
        label: 'Company Website',
        type: 'url',
        placeholder: 'https://example.com'
      }
    ]
  },
  product: {
    title: 'Product',
    apiEndpoint: '/api/products',
    queryKey: ['/api/strategic-profiles'],
    fields: [
      {
        name: 'title',
        label: 'Product Name',
        type: 'text',
        required: true,
        placeholder: 'My Amazing Product'
      },
      {
        name: 'productService',
        label: 'Product Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe what your product does...',
        helpText: 'A clear description of your product or service'
      },
      {
        name: 'customerFeedback',
        label: 'What Customers Like',
        type: 'textarea',
        placeholder: 'Customers love our product because...',
        helpText: 'What do customers say they like about your product?'
      },
      {
        name: 'website',
        label: 'Product Link',
        type: 'url',
        placeholder: 'https://myproduct.com'
      }
    ]
  },
  customer: {
    title: 'Customer Profile',
    apiEndpoint: '/api/customer-profiles',
    queryKey: ['/api/customer-profiles'],
    fields: [
      {
        name: 'displayName',
        label: 'Profile Name',
        type: 'text',
        required: true,
        placeholder: 'Enterprise B2B Customers'
      },
      {
        name: 'targetIndustry',
        label: 'Target Industry',
        type: 'text',
        placeholder: 'Technology, Healthcare, Finance...'
      },
      {
        name: 'companySize',
        label: 'Company Size',
        type: 'text',
        placeholder: '100-500 employees'
      },
      {
        name: 'targetRole',
        label: 'Target Role',
        type: 'text',
        placeholder: 'VP of Sales, Marketing Manager...'
      },
      {
        name: 'painPoints',
        label: 'Pain Points',
        type: 'textarea',
        placeholder: 'What problems do they face?'
      },
      {
        name: 'goals',
        label: 'Goals',
        type: 'textarea',
        placeholder: 'What are they trying to achieve?'
      }
    ]
  }
};

export function ProfileModal({
  isOpen,
  onClose,
  profileType,
  profile,
  onSuccess
}: ProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!profile;
  const config = profileConfigs[profileType];

  // Initialize form data based on profile type
  const getInitialFormData = () => {
    const initialData: any = {
      isDefault: false
    };
    
    // Add default values for required fields
    if (profileType === 'product') {
      initialData.businessType = 'product';
      initialData.businessDescription = '';
      initialData.targetCustomers = '';
    }
    
    config.fields.forEach(field => {
      initialData[field.name] = '';
    });
    
    return initialData;
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Update form data when modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      if (profile) {
        // Editing existing profile - populate with current values
        const newFormData: any = { ...getInitialFormData() };
        config.fields.forEach(field => {
          newFormData[field.name] = profile[field.name] || '';
        });
        newFormData.isDefault = profile.isDefault || false;
        
        // Add hidden fields for sender profiles
        if (profileType === 'sender') {
          newFormData.source = profile.source || 'manual';
        }
        
        // Add hidden fields for products
        if (profileType === 'product') {
          newFormData.businessType = profile.businessType || 'product';
          newFormData.businessDescription = profile.businessDescription || profile.productService || '';
          newFormData.targetCustomers = profile.targetCustomers || 'General audience';
        }
        
        setFormData(newFormData);
      } else {
        // Creating new profile - reset to empty
        setFormData(getInitialFormData());
      }
    }
  }, [isOpen, profile, profileType]);

  // Auto-generate display name for sender profiles
  const handleFieldChange = (fieldName: string, value: string) => {
    const newData = { ...formData, [fieldName]: value };
    
    // Auto-generate display name for sender profiles
    if (profileType === 'sender' && (fieldName === 'firstName' || fieldName === 'lastName')) {
      if (!profile || formData.displayName === `${formData.firstName} ${formData.lastName}`.trim()) {
        const firstName = fieldName === 'firstName' ? value : formData.firstName;
        const lastName = fieldName === 'lastName' ? value : formData.lastName;
        newData.displayName = `${firstName} ${lastName}`.trim() || '';
      }
    }
    
    setFormData(newData);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Prepare data for products
      if (profileType === 'product') {
        data.businessDescription = data.productService || data.businessDescription;
        data.targetCustomers = data.targetCustomers || 'General audience';
      }
      return apiRequest('POST', config.apiEndpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${config.title} created successfully`
      });
      queryClient.invalidateQueries({ queryKey: config.queryKey });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to create ${config.title.toLowerCase()}`,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Prepare data for products
      if (profileType === 'product') {
        data.businessDescription = data.productService || data.businessDescription;
        data.targetCustomers = data.targetCustomers || 'General audience';
      }
      return apiRequest('PATCH', `${config.apiEndpoint}/${profile?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${config.title} updated successfully`
      });
      queryClient.invalidateQueries({ queryKey: config.queryKey });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to update ${config.title.toLowerCase()}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = config.fields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  
  // Check if field should be disabled (for connected profiles)
  const isFieldDisabled = (fieldName: string) => {
    if (profileType === 'sender' && fieldName === 'email') {
      return formData.source === 'registered' || formData.source === 'gmail';
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${config.title}` : `Create New ${config.title}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field) => {
            const isDisabled = isFieldDisabled(field.name);
            const FieldComponent = field.type === 'textarea' ? Textarea : Input;
            
            // Group first and last name in a grid for sender profiles
            if (profileType === 'sender' && field.name === 'firstName') {
              const lastNameField = config.fields.find(f => f.name === 'lastName');
              return (
                <div key={field.name} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id={field.name}
                      value={formData[field.name]}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={isDisabled}
                    />
                  </div>
                  {lastNameField && (
                    <div className="space-y-2">
                      <Label htmlFor={lastNameField.name}>
                        {lastNameField.label} {lastNameField.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id={lastNameField.name}
                        value={formData[lastNameField.name]}
                        onChange={(e) => handleFieldChange(lastNameField.name, e.target.value)}
                        placeholder={lastNameField.placeholder}
                        required={lastNameField.required}
                      />
                    </div>
                  )}
                </div>
              );
            }
            
            // Skip lastName as it's already rendered with firstName
            if (profileType === 'sender' && field.name === 'lastName') {
              return null;
            }
            
            // Group title and position for sender profiles
            if (profileType === 'sender' && field.name === 'title') {
              const positionField = config.fields.find(f => f.name === 'companyPosition');
              return (
                <div key={field.name} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      value={formData[field.name]}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                  {positionField && (
                    <div className="space-y-2">
                      <Label htmlFor={positionField.name}>{positionField.label}</Label>
                      <Input
                        id={positionField.name}
                        value={formData[positionField.name]}
                        onChange={(e) => handleFieldChange(positionField.name, e.target.value)}
                        placeholder={positionField.placeholder}
                      />
                    </div>
                  )}
                </div>
              );
            }
            
            // Skip companyPosition as it's already rendered with title
            if (profileType === 'sender' && field.name === 'companyPosition') {
              return null;
            }
            
            // Group company name and website for sender profiles
            if (profileType === 'sender' && field.name === 'companyName') {
              const websiteField = config.fields.find(f => f.name === 'companyWebsite');
              return (
                <div key={field.name} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      value={formData[field.name]}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                  {websiteField && (
                    <div className="space-y-2">
                      <Label htmlFor={websiteField.name}>{websiteField.label}</Label>
                      <Input
                        id={websiteField.name}
                        value={formData[websiteField.name]}
                        onChange={(e) => handleFieldChange(websiteField.name, e.target.value)}
                        placeholder={websiteField.placeholder}
                      />
                    </div>
                  )}
                </div>
              );
            }
            
            // Skip companyWebsite as it's already rendered with companyName
            if (profileType === 'sender' && field.name === 'companyWebsite') {
              return null;
            }
            
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  {isDisabled && (
                    <Lock className="w-3 h-3 inline-block ml-2 text-muted-foreground" />
                  )}
                </Label>
                <FieldComponent
                  id={field.name}
                  type={field.type === 'textarea' ? undefined : field.type}
                  value={formData[field.name]}
                  onChange={(e: any) => {
                    if (!isDisabled) {
                      handleFieldChange(field.name, e.target.value);
                    }
                  }}
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={isDisabled}
                  className={isDisabled ? 'bg-muted' : ''}
                />
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
                {isDisabled && profileType === 'sender' && field.name === 'email' && (
                  <p className="text-xs text-muted-foreground">
                    Email is synced with {formData.source === 'registered' ? 'your registered account' : 'Gmail API'}
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isDefault: checked === true })
              }
            />
            <Label 
              htmlFor="isDefault"
              className="text-sm cursor-pointer"
            >
              Set as default {profileType === 'sender' ? 'sender profile' : 'product'}
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...')
                : (isEditing ? `Update ${config.title}` : `Create ${config.title}`)
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}