import { Bell, AlertTriangle, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, AppNotification } from "@/hooks/use-notifications";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

function NotificationItem({ notification }: { notification: AppNotification }) {
  const icon = notification.type === "failed_backup"
    ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
    : <Clock className="h-4 w-4 text-amber-500 shrink-0" />;

  return (
    <Link
      to={notification.type === "failed_backup" ? "/backups" : `/projects/${notification.projectId}`}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{notification.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: he })}
        </p>
      </div>
    </Link>
  );
}

export function NotificationsBell() {
  const { notifications, totalCount } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-foreground" />
          {totalCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground border-2 border-background">
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir="rtl">
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-foreground">התראות</h3>
          <p className="text-xs text-muted-foreground">{totalCount} התראות פעילות</p>
        </div>
        {totalCount === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">אין התראות חדשות</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-1 space-y-0.5">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
