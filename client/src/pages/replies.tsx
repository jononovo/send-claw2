import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Plus, ArrowLeft, Clock, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

// Mock data for development - will be replaced with actual data from API
const MOCK_ACTIVE_CONTACTS = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@acmecorp.com",
    company: "Acme Corporation",
    role: "Marketing Director",
    lastMessage: "That sounds interesting. Can you tell me more about your pricing?",
    lastMessageDate: new Date("2025-05-10T14:30:00"),
    unread: true,
    avatarUrl: ""
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@techinnovate.com",
    company: "Tech Innovate",
    role: "CTO",
    lastMessage: "I've forwarded your proposal to our team. Let's schedule a call.",
    lastMessageDate: new Date("2025-05-09T09:15:00"),
    unread: false,
    avatarUrl: ""
  },
  {
    id: 3,
    name: "Aisha Patel",
    email: "aisha.patel@globexind.com",
    company: "Globex Industries",
    role: "Head of Operations",
    lastMessage: "Thanks for your email. I'd be interested in learning how this works for our industry specifically.",
    lastMessageDate: new Date("2025-05-08T16:45:00"),
    unread: true,
    avatarUrl: ""
  }
];

const MOCK_EMAIL_THREADS = [
  {
    id: 101,
    contactId: 1,
    subject: "Introduction to 5Ducks Lead Generation Platform",
    messages: [
      {
        id: 1001,
        from: "me",
        fromEmail: "user@example.com",
        to: "Sarah Johnson",
        toEmail: "sarah.johnson@acmecorp.com",
        content: "Hi Sarah,\n\nI noticed Acme Corporation has been expanding its marketing efforts recently. I wanted to introduce you to our lead generation platform that has helped companies like yours increase qualified leads by 35%.\n\nWould you be interested in a quick 15-minute demo?\n\nBest regards,\nAlex",
        timestamp: new Date("2025-05-07T10:30:00")
      },
      {
        id: 1002,
        from: "Sarah Johnson",
        fromEmail: "sarah.johnson@acmecorp.com",
        to: "me",
        toEmail: "user@example.com",
        content: "Hi Alex,\n\nThat sounds interesting. Can you tell me more about your pricing?\n\nSarah Johnson\nMarketing Director\nAcme Corporation",
        timestamp: new Date("2025-05-10T14:30:00")
      }
    ]
  },
  {
    id: 102,
    contactId: 1,
    subject: "Marketing Webinar Invitation",
    messages: [
      {
        id: 1003,
        from: "me",
        fromEmail: "user@example.com",
        to: "Sarah Johnson",
        toEmail: "sarah.johnson@acmecorp.com",
        content: "Hi Sarah,\n\nWe're hosting a webinar next week on 'Digital Marketing Trends for 2025'. Given your role at Acme, I thought you might be interested.\n\nHere's the registration link: [webinar link]\n\nBest,\nAlex",
        timestamp: new Date("2025-05-01T11:15:00")
      }
    ]
  }
];

interface Contact {
  id: number;
  name: string;
  email: string;
  company: string;
  role?: string;
  lastMessage: string;
  lastMessageDate: Date;
  unread: boolean;
  avatarUrl?: string;
}

interface EmailMessage {
  id: number;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  content: string;
  timestamp: Date;
}

interface EmailThread {
  id: number;
  contactId: number;
  subject: string;
  messages: EmailMessage[];
}

export default function Replies() {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  // In a real implementation, these would be API calls
  const { data: activeContacts = MOCK_ACTIVE_CONTACTS } = useQuery<Contact[]>({
    queryKey: ["/api/replies/contacts"],
    enabled: false
  });

  const { data: emailThreads = MOCK_EMAIL_THREADS } = useQuery<EmailThread[]>({
    queryKey: ["/api/replies/threads", selectedContactId],
    enabled: false
  });

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter threads for the selected contact
  const contactThreads = emailThreads.filter(
    thread => thread.contactId === selectedContactId
  );

  // Get the currently selected thread
  const selectedThread = emailThreads.find(thread => thread.id === selectedThreadId);

  // Get the selected contact
  const selectedContact = activeContacts.find(
    contact => contact.id === selectedContactId
  );

  const handleSelectContact = (contactId: number) => {
    setSelectedContactId(contactId);
    setSelectedThreadId(null);
  };

  const handleSelectThread = (threadId: number) => {
    setSelectedThreadId(threadId);
  };

  const handleBack = () => {
    if (selectedThreadId) {
      setSelectedThreadId(null);
    } else if (selectedContactId) {
      setSelectedContactId(null);
    }
  };

  const handleNewThread = () => {
    toast({
      title: "Starting new thread",
      description: "This functionality will allow you to start a new thread with this contact."
    });
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

    toast({
      title: "Sending reply",
      description: "Your reply is being sent..."
    });
    
    setReplyContent("");
  };

  // Mobile view rendering
  const renderMobileView = () => {
    // What to show on mobile depends on the navigation state
    if (selectedThreadId) {
      // Show thread content when a thread is selected
      return (
        <div className="w-full h-full">
          <Card className="h-full flex flex-col rounded-none shadow-none">
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="mr-2 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl truncate">
                  {selectedThread?.subject}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                With {selectedContact?.name} ({selectedContact?.email})
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
              <ScrollArea className="flex-1 pr-2 mb-4">
                <div className="space-y-4">
                  {selectedThread?.messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 rounded-lg",
                        message.from === "me"
                          ? "bg-primary/10 ml-4"
                          : "bg-accent/50 mr-4 border border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback className={cn(
                              message.from === "me"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {message.from === "me" ? "ME" : message.from.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {message.from === "me" ? "Me" : message.from}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {message.from === "me" ? "to " : "from "}
                              {message.from === "me" ? message.to : message.fromEmail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(message.timestamp, "MMM d, h:mm a")}
                        </div>
                      </div>
                      <div className="mt-2 text-sm whitespace-pre-line">
                        {message.content}
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
                  <div className="flex justify-between items-center mt-3">
                    <Button onClick={handleSendReply} className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else if (selectedContactId) {
      // Show thread list when a contact is selected but no thread
      return (
        <div className="w-full h-full">
          <Card className="h-full flex flex-col rounded-none shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between px-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="mr-2 -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-xl truncate">
                  {selectedContact?.name}
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewThread}
                className="ml-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Email
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                  {contactThreads.length > 0 ? (
                    contactThreads.map(thread => (
                      <Card
                        key={thread.id}
                        className="cursor-pointer transition-colors hover:bg-accent/30"
                        onClick={() => handleSelectThread(thread.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold truncate mr-2">{thread.subject}</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(
                                thread.messages[thread.messages.length - 1].timestamp,
                                "MMM d, h:mm a"
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {thread.messages[thread.messages.length - 1].content}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-muted-foreground">
                            <Mail className="mr-1 h-3 w-3" />
                            <span>{thread.messages.length} messages</span>
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
                      <Button className="mt-4" onClick={handleNewThread}>
                        <Plus className="mr-2 h-4 w-4" />
                        Start New Thread
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      // Show contacts list when nothing is selected
      return (
        <div className="w-full h-full">
          <Card className="h-full flex flex-col rounded-none shadow-none">
            <CardHeader className="pb-3 px-4">
              <CardTitle className="text-xl flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Active Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-2">
                  {activeContacts.map(contact => (
                    <div
                      key={contact.id}
                      className={cn(
                        "cursor-pointer p-3 rounded-lg transition-colors",
                        "hover:bg-accent-hover",
                        "bg-card border border-border"
                      )}
                      onClick={() => handleSelectContact(contact.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={contact.avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {contact.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">{contact.name}</h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(contact.lastMessageDate, "MMM d")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.company}
                            {contact.role && ` • ${contact.role}`}
                          </p>
                          <p className={cn(
                            "text-sm mt-1 truncate",
                            contact.unread ? "font-medium" : "text-muted-foreground"
                          )}>
                            {contact.lastMessage}
                          </p>
                        </div>
                      </div>
                      {contact.unread && (
                        <div className="flex justify-end mt-1">
                          <Badge variant="default" className="text-xs">New</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  // Desktop layout rendering
  const renderDesktopLayout = () => {
    return (
      <>
        {/* Left Column - Contacts or Thread List */}
        <div className={selectedThreadId ? "w-1/3" : (selectedContactId ? "w-1/3" : "w-full")} style={{ height: "100%" }}>
          <Card className="h-full flex flex-col rounded-lg shadow-none border-0">
            {!selectedThreadId ? (
              // Show contacts list when no thread is selected
              <>
                <CardHeader className="pb-3 px-2">
                  <CardTitle className="text-xl flex items-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Active Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden px-2 py-1">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-2">
                      {activeContacts.map(contact => (
                        <div
                          key={contact.id}
                          className={cn(
                            "cursor-pointer p-3 rounded-lg transition-colors",
                            "hover:bg-accent-hover",
                            selectedContactId === contact.id
                              ? "bg-accent-active"
                              : "bg-card border border-border"
                          )}
                          onClick={() => handleSelectContact(contact.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={contact.avatarUrl} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {contact.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium truncate">{contact.name}</h4>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(contact.lastMessageDate, "MMM d")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.company}
                                {contact.role && ` • ${contact.role}`}
                              </p>
                              <p className={cn(
                                "text-sm mt-1 truncate",
                                contact.unread ? "font-medium" : "text-muted-foreground"
                              )}>
                                {contact.lastMessage}
                              </p>
                            </div>
                          </div>
                          {contact.unread && (
                            <div className="flex justify-end mt-1">
                              <Badge variant="default" className="text-xs">New</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              // Show thread list when a thread is selected
              <>
                <CardHeader className="pb-3 flex flex-row items-center justify-between px-6">
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBack}
                      className="mr-2 -ml-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <CardTitle className="text-xl truncate">
                      {selectedContact?.name}
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewThread}
                    className="ml-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Email
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden px-2 py-2">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {contactThreads.map(thread => (
                        <Card
                          key={thread.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-accent/30",
                            selectedThreadId === thread.id && "bg-accent/20"
                          )}
                          onClick={() => handleSelectThread(thread.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold truncate mr-2">{thread.subject}</h3>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(
                                  thread.messages[thread.messages.length - 1].timestamp,
                                  "MMM d, h:mm a"
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {thread.messages[thread.messages.length - 1].content}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" />
                              <span>{thread.messages.length} messages</span>
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

        {/* Middle Column - Threads List */}
        {selectedContactId && !selectedThreadId && (
          <div className="w-2/3 pl-4" style={{ height: "100%" }}>
            <Card className="h-full flex flex-col rounded-lg shadow">
              <CardHeader className="pb-3 flex flex-row items-center justify-between px-6">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="mr-2 -ml-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="text-xl truncate">
                    {selectedContact?.name}
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewThread}
                  className="ml-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Email
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden px-2 py-2">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {contactThreads.length > 0 ? (
                      contactThreads.map(thread => (
                        <Card
                          key={thread.id}
                          className="cursor-pointer transition-colors hover:bg-accent/30"
                          onClick={() => handleSelectThread(thread.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold truncate mr-2">{thread.subject}</h3>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(
                                  thread.messages[thread.messages.length - 1].timestamp,
                                  "MMM d, h:mm a"
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {thread.messages[thread.messages.length - 1].content}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" />
                              <span>{thread.messages.length} messages</span>
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
                        <Button className="mt-4" onClick={handleNewThread}>
                          <Plus className="mr-2 h-4 w-4" />
                          Start New Thread
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Right Column - Thread Content */}
        {selectedThreadId && (
          <div className="w-2/3 pl-4" style={{ height: "100%" }}>
            <Card className="h-full flex flex-col rounded-lg shadow-none border-0">
              <CardHeader className="pb-3 px-2">
                <div>
                  <CardTitle className="text-xl truncate">
                    {selectedThread?.subject}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    With {selectedContact?.name} ({selectedContact?.email})
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden px-2 py-2">
                {/* Message thread view */}
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-6">
                    {selectedThread?.messages.map(message => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-4 rounded-lg",
                          message.from === "me"
                            ? "bg-primary/10 ml-12"
                            : "bg-accent/50 mr-12 border border-border"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback className={cn(
                                message.from === "me"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {message.from === "me" ? "ME" : message.from.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {message.from === "me" ? "Me" : message.from}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {message.from === "me" ? "to " : "from "}
                                {message.from === "me" ? message.to : message.fromEmail}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {format(message.timestamp, "MMM d, h:mm a")}
                          </div>
                        </div>
                        <div className="mt-2 text-sm whitespace-pre-line">
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Reply editor */}
                <div className="mt-auto">
                  <div className="border rounded-lg p-3">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Type your reply here..."
                      className="min-h-[100px] focus-visible:ring-0 border-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <Button variant="outline" size="sm">
                        <Edit3 className="mr-2 h-4 w-4" />
                        Format
                      </Button>
                      <Button onClick={handleSendReply}>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reply
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