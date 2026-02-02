import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Plus, ArrowLeft, Clock, Inbox as InboxIcon, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  botId: string;
  direction: "inbound" | "outbound";
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  threadId: string | null;
  inReplyTo: string | null;
  messageId: string | null;
  createdAt: string;
}

interface HandleData {
  id: string;
  address: string;
  reservedAt: string | null;
  botId: string | null;
}

interface BotData {
  id: string;
  name: string;
  verified: boolean;
  claimedAt: string | null;
  createdAt: string;
}

interface MyInboxResponse {
  handle: HandleData | null;
  bot: BotData | null;
  messages: Message[];
  error?: string;
}

interface Contact {
  email: string;
  lastMessage: string;
  lastMessageDate: Date;
  unreadCount: number;
}

interface Thread {
  threadId: string;
  contactEmail: string;
  subject: string;
  messages: Message[];
  lastMessageDate: Date;
}

export default function UnifiedInbox() {
  const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [newEmailTo, setNewEmailTo] = useState("");
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<MyInboxResponse>({
    queryKey: ["/api/my-inbox"],
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { to: string; subject: string; body: string; inReplyTo?: string }) => {
      return apiRequest("POST", "/api/inbox/send", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-inbox"] });
      toast({ title: "Email sent", description: "Your email has been sent successfully." });
      setReplyContent("");
      setNewEmailOpen(false);
      setNewEmailTo("");
      setNewEmailSubject("");
      setNewEmailBody("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send", 
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
    },
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userHandle = data?.handle;
  const userBot = data?.bot;
  const messages = data?.messages || [];

  const contacts: Contact[] = (() => {
    const contactMap = new Map<string, Contact>();
    
    messages.forEach(msg => {
      const counterparty = msg.direction === 'inbound' ? msg.fromAddress : msg.toAddress;
      const existing = contactMap.get(counterparty);
      const msgDate = new Date(msg.createdAt);
      
      if (!existing || msgDate > existing.lastMessageDate) {
        contactMap.set(counterparty, {
          email: counterparty,
          lastMessage: msg.bodyText?.substring(0, 100) || msg.subject || "(no content)",
          lastMessageDate: msgDate,
          unreadCount: 0,
        });
      }
    });
    
    return Array.from(contactMap.values())
      .sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
  })();

  const threads: Thread[] = (() => {
    const threadMap = new Map<string, Thread>();
    
    messages.forEach(msg => {
      const threadKey = msg.threadId || msg.id;
      const counterparty = msg.direction === 'inbound' ? msg.fromAddress : msg.toAddress;
      
      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, {
          threadId: threadKey,
          contactEmail: counterparty,
          subject: msg.subject || "(no subject)",
          messages: [],
          lastMessageDate: new Date(msg.createdAt),
        });
      }
      
      const thread = threadMap.get(threadKey)!;
      thread.messages.push(msg);
      
      const msgDate = new Date(msg.createdAt);
      if (msgDate > thread.lastMessageDate) {
        thread.lastMessageDate = msgDate;
      }
    });
    
    threadMap.forEach(thread => {
      thread.messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    
    return Array.from(threadMap.values())
      .sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
  })();

  const contactThreads = threads.filter(t => t.contactEmail === selectedContactEmail);
  const selectedThread = threads.find(t => t.threadId === selectedThreadId);
  const selectedContact = contacts.find(c => c.email === selectedContactEmail);

  const handleSelectContact = (email: string) => {
    setSelectedContactEmail(email);
    setSelectedThreadId(null);
  };

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleBack = () => {
    if (selectedThreadId) {
      setSelectedThreadId(null);
    } else if (selectedContactEmail) {
      setSelectedContactEmail(null);
    }
  };

  const handleSendReply = () => {
    if (!replyContent.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message before sending.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedThread || !selectedContact) return;

    const lastMessage = selectedThread.messages[selectedThread.messages.length - 1];
    
    sendMutation.mutate({
      to: selectedContact.email,
      subject: `Re: ${selectedThread.subject}`,
      body: replyContent,
      inReplyTo: lastMessage.messageId || undefined,
    });
  };

  const handleSendNewEmail = () => {
    if (!newEmailTo.trim() || !newEmailBody.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in the recipient and message.",
        variant: "destructive"
      });
      return;
    }

    sendMutation.mutate({
      to: newEmailTo,
      subject: newEmailSubject || "(no subject)",
      body: newEmailBody,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const renderMobileView = () => {
    if (selectedThreadId && selectedThread) {
      return (
        <div className="w-full h-full">
          <Card className="h-full flex flex-col rounded-none shadow-none">
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center mb-2">
                <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2 -ml-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl truncate">{selectedThread.subject}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">With {selectedContact?.email}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
              <ScrollArea className="flex-1 pr-2 mb-4">
                <div className="space-y-4">
                  {selectedThread.messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 rounded-lg",
                        message.direction === "outbound"
                          ? "bg-primary/10 ml-4"
                          : "bg-accent/50 mr-4 border border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback className={cn(
                              message.direction === "outbound"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {message.direction === "outbound" ? "ME" : message.fromAddress.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {message.direction === "outbound" ? "Me" : message.fromAddress}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {message.direction === "outbound" ? `to ${message.toAddress}` : `from ${message.fromAddress}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(new Date(message.createdAt), "MMM d, h:mm a")}
                        </div>
                      </div>
                      <div className="mt-2 text-sm whitespace-pre-line">
                        {message.bodyText || "(empty message)"}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-auto">
                <div className="border rounded-lg p-3">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply here..."
                    className="min-h-[80px] focus-visible:ring-0 border-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/50"
                  />
                  <div className="flex justify-end mt-3">
                    <Button onClick={handleSendReply} disabled={sendMutation.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      {sendMutation.isPending ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else if (selectedContactEmail) {
      return (
        <div className="w-full h-full">
          <Card className="h-full flex flex-col rounded-none shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between px-4">
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2 -ml-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl truncate">{selectedContactEmail}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                  {contactThreads.length > 0 ? (
                    contactThreads.map(thread => (
                      <Card
                        key={thread.threadId}
                        className="cursor-pointer transition-colors hover:bg-accent/30"
                        onClick={() => handleSelectThread(thread.threadId)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold truncate mr-2">{thread.subject}</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(thread.lastMessageDate, "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {thread.messages[thread.messages.length - 1].bodyText || "(no content)"}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-muted-foreground">
                            <Mail className="mr-1 h-3 w-3" />
                            <span>{thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-60 text-center">
                      <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium text-muted-foreground">No email threads</h3>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full">
          <Card className="h-full flex flex-col rounded-none shadow-none">
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <InboxIcon className="mr-2 h-5 w-5" />
                    {userBot?.name ? `${userBot.name} Inbox` : 'Inbox'}
                  </CardTitle>
                  {userHandle && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">{userHandle.address}</span>
                      <button onClick={() => copyToClipboard(userHandle.address)} className="text-muted-foreground hover:text-primary">
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                <Dialog open={newEmailOpen} onOpenChange={setNewEmailOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Compose
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>New Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Input
                          placeholder="To: email@example.com"
                          value={newEmailTo}
                          onChange={(e) => setNewEmailTo(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Subject"
                          value={newEmailSubject}
                          onChange={(e) => setNewEmailSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="Write your message..."
                          value={newEmailBody}
                          onChange={(e) => setNewEmailBody(e.target.value)}
                          className="min-h-[200px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleSendNewEmail} disabled={sendMutation.isPending}>
                          <Send className="mr-2 h-4 w-4" />
                          {sendMutation.isPending ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full pr-2">
                {contacts.length > 0 ? (
                  <div className="space-y-2">
                    {contacts.map(contact => (
                      <div
                        key={contact.email}
                        className="cursor-pointer p-3 rounded-lg transition-colors hover:bg-accent-hover bg-card border border-border"
                        onClick={() => handleSelectContact(contact.email)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {contact.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium truncate">{contact.email}</h4>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(contact.lastMessageDate, "MMM d")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {contact.lastMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 text-center">
                    <InboxIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-muted-foreground mb-2">Inbox is empty</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {userHandle 
                        ? `Send your first email or receive messages at ${userHandle.address}`
                        : "Reserve a handle to start sending and receiving emails."
                      }
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  const renderDesktopLayout = () => {
    return (
      <>
        <div className={selectedThreadId ? "w-1/3" : (selectedContactEmail ? "w-1/3" : "w-full")} style={{ height: "100%" }}>
          <Card className="h-full flex flex-col rounded-lg shadow-none border-0">
            {!selectedThreadId ? (
              <>
                <CardHeader className="pb-3 px-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center">
                        <InboxIcon className="mr-2 h-5 w-5" />
                        {userBot?.name ? `${userBot.name} Inbox` : 'Inbox'}
                      </CardTitle>
                      {userHandle && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">{userHandle.address}</span>
                          <button onClick={() => copyToClipboard(userHandle.address)} className="text-muted-foreground hover:text-primary">
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                    <Dialog open={newEmailOpen} onOpenChange={setNewEmailOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Compose
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>New Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Input
                          placeholder="To: email@example.com"
                          value={newEmailTo}
                          onChange={(e) => setNewEmailTo(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Subject"
                          value={newEmailSubject}
                          onChange={(e) => setNewEmailSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="Write your message..."
                          value={newEmailBody}
                          onChange={(e) => setNewEmailBody(e.target.value)}
                          className="min-h-[200px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleSendNewEmail} disabled={sendMutation.isPending}>
                          <Send className="mr-2 h-4 w-4" />
                          {sendMutation.isPending ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden px-2 py-1">
                  <ScrollArea className="h-full pr-4">
                    {contacts.length > 0 ? (
                      <div className="space-y-2">
                        {contacts.map(contact => (
                          <div
                            key={contact.email}
                            className={cn(
                              "cursor-pointer p-3 rounded-lg transition-colors hover:bg-accent-hover",
                              selectedContactEmail === contact.email
                                ? "bg-accent-active"
                                : "bg-card border border-border"
                            )}
                            onClick={() => handleSelectContact(contact.email)}
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {contact.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium truncate">{contact.email}</h4>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(contact.lastMessageDate, "MMM d")}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {contact.lastMessage}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-60 text-center">
                        <InboxIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="font-medium text-muted-foreground mb-2">Inbox is empty</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {userHandle 
                            ? `Send your first email or receive messages at ${userHandle.address}`
                            : "Reserve a handle to start sending and receiving emails."
                          }
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="pb-3 flex flex-row items-center justify-between px-6">
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2 -ml-2">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <CardTitle className="text-xl truncate">{selectedContactEmail}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden px-2 py-2">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {contactThreads.map(thread => (
                        <Card
                          key={thread.threadId}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-accent/30",
                            selectedThreadId === thread.threadId && "bg-accent/20"
                          )}
                          onClick={() => handleSelectThread(thread.threadId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold truncate mr-2">{thread.subject}</h3>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(thread.lastMessageDate, "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {thread.messages[thread.messages.length - 1].bodyText || "(no content)"}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" />
                              <span>{thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        {selectedContactEmail && !selectedThreadId && (
          <div className="w-2/3 pl-4" style={{ height: "100%" }}>
            <Card className="h-full flex flex-col rounded-lg shadow">
              <CardHeader className="pb-3 flex flex-row items-center justify-between px-6">
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2 -ml-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="text-xl truncate">{selectedContactEmail}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden px-2 py-2">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {contactThreads.length > 0 ? (
                      contactThreads.map(thread => (
                        <Card
                          key={thread.threadId}
                          className="cursor-pointer transition-colors hover:bg-accent/30"
                          onClick={() => handleSelectThread(thread.threadId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold truncate mr-2">{thread.subject}</h3>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(thread.lastMessageDate, "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {thread.messages[thread.messages.length - 1].bodyText || "(no content)"}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" />
                              <span>{thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-60 text-center">
                        <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="font-medium text-muted-foreground">No email threads</h3>
                        <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                          Start a new conversation with this contact
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedThreadId && selectedThread && (
          <div className="w-2/3 pl-4" style={{ height: "100%" }}>
            <Card className="h-full flex flex-col rounded-lg shadow-none border-0">
              <CardHeader className="pb-3 px-2">
                <div>
                  <CardTitle className="text-xl truncate">{selectedThread.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">With {selectedContact?.email}</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden px-2 py-2">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-6">
                    {selectedThread.messages.map(message => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-4 rounded-lg",
                          message.direction === "outbound"
                            ? "bg-primary/10 ml-12"
                            : "bg-accent/50 mr-12 border border-border"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback className={cn(
                                message.direction === "outbound"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {message.direction === "outbound" ? "ME" : message.fromAddress.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {message.direction === "outbound" ? "Me" : message.fromAddress}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {message.direction === "outbound" ? `to ${message.toAddress}` : `from ${message.fromAddress}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {format(new Date(message.createdAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                        <div className="mt-2 text-sm whitespace-pre-line">
                          {message.bodyText || "(empty message)"}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="mt-auto">
                  <div className="border rounded-lg p-3">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Type your reply here..."
                      className="min-h-[100px] focus-visible:ring-0 border-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex justify-end mt-3">
                      <Button onClick={handleSendReply} disabled={sendMutation.isPending}>
                        <Send className="mr-2 h-4 w-4" />
                        {sendMutation.isPending ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:py-6 md:px-6">
      <div className="flex h-full overflow-hidden md:space-x-4">
        {isMobile ? renderMobileView() : renderDesktopLayout()}
      </div>
    </div>
  );
}
