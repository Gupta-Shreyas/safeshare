export const SITE = {
  name: "SafeShare",
  email: "", // example: "hello@yourdomain.com"
  phone: "", // example: "+91 98765 43210"
};

export const telHref = (p: string) => "tel:" + p.replace(/[^\d+]/g, "");