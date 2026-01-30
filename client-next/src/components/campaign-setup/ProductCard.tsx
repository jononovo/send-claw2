import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Package, Plus, Check } from 'lucide-react';

interface Product {
  id: number;
  userId: number;
  title: string;
  productService: string;
  customerFeedback?: string;
  website?: string;
  businessType: 'product' | 'service';
  status: string;
  createdAt?: string;
  targetCustomers?: string;
  primaryCustomerType?: string;
  marketNiche?: string;
}

interface ProductCardProps {
  products: Product[] | undefined;
  selectedProductId: number | null;
  isLoading: boolean;
  onProductChange: (productId: number) => void;
  onAddProduct: () => void;
}

export function ProductCard({
  products,
  selectedProductId,
  isLoading,
  onProductChange,
  onAddProduct
}: ProductCardProps) {
  return (
    <Card className={cn(
      "relative transition-all duration-300 border-2",
      selectedProductId 
        ? "border-primary bg-primary/5 shadow-lg" 
        : "hover:shadow-xl hover:border-primary/30"
    )}>
      {/* Progress indicator */}
      {selectedProductId && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              My Product
            </CardTitle>
            <CardDescription className="text-xs">
              What are you selling?
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddProduct}
            data-testid="button-add-product"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : products && products.length > 0 ? (
          <div className="space-y-2">
            {products
              .sort((a, b) => {
                // Stable sort: by creation date, then by ID
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                if (dateA !== dateB) {
                  return dateB - dateA; // Most recent first
                }
                return a.id - b.id;
              })
              .slice(0, 3)
              .map((product) => (
              <div
                key={product.id}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-all",
                  selectedProductId === product.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onProductChange(product.id)}
                data-testid={`product-${product.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{product.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {product.productService}
                    </div>
                  </div>
                  {selectedProductId === product.id && (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-16 w-16 rounded-full p-0"
              onClick={onAddProduct}
              data-testid="button-create-product"
            >
              <Plus className="h-8 w-8 text-muted-foreground/30" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Add your product
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}