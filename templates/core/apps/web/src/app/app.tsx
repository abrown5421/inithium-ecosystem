import { useState } from 'react';
import {
  AnimateBox,
  Box,
  Text,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  RadioGroup,
  RadioGroupItem,
  Slider,
  Switch,
  Checkbox,
  AlertContainer,
  alert,
} from '@inithium/ui';

const urgencyLabel = (value: number) => {
  if (value < 34) return 'Low';
  if (value < 67) return 'Medium';
  return 'High';
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
  terms?: string;
}

export function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [reason, setReason] = useState('support');
  const [contactMethod, setContactMethod] = useState('email');
  const [urgency, setUrgency] = useState([50]);
  const [subscribe, setSubscribe] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // The browser's own native constraint validation (triggered by the `required` attribute
  // Input/Textarea/Checkbox forward - see FieldShell's `required` handling) intercepts and
  // cancels the submit event entirely before onSubmit ever runs, so it can't be the thing
  // driving `error`/`helperText`/the alert - <form noValidate> below hands that fully back to
  // this validate() function, which is the single source of truth for both.
  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) nextErrors.name = 'Full name is required.';

    if (!email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!message.trim()) nextErrors.message = "Please tell us what's going on.";

    if (!agreeToTerms) nextErrors.terms = 'You must agree to the terms and conditions.';

    return nextErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      alert.danger('There was an error with your submission. Please check the highlighted fields.');
      return;
    }

    setSubmitted(true);
    alert.success('Your message has been sent. We will get back to you within one business day.');
  };

  return (
    <>
      <AlertContainer />
      <Box
        as="div"
        bgColor={{ color: 'surface', intensity: 200 }}
        flex={{ direction: 'row', justify: 'center', align: 'center' }}
        padding={{ base: 24 }}
        className="min-h-screen w-full"
      >
        <form onSubmit={handleSubmit} noValidate className="w-full max-w-xl">
          <AnimateBox
            as="div"
            animation={{ entrance: 'animate__fadeInUp' }}
            bgColor={{ color: 'surface', intensity: 100 }}
            borderColor={{ color: 'surface', intensity: 300 }}
            flex={{ direction: 'col', gap: 20 }}
            padding={{ base: 32 }}
            className="w-full rounded-xl shadow-lg"
          >
            <Box flex={{ direction: 'col', gap: 4 }}>
              <Text as="h1" textColor={{ color: 'surface', intensity: 900 }} className="text-2xl font-semibold">
                Get in touch
              </Text>
              <Text textColor={{ color: 'surface', intensity: 600 }} className="text-sm">
                Fill out the form below and our team will get back to you within one business day.
              </Text>
            </Box>

            <Input
              label="Full name"
              placeholder="Ada Lovelace"
              color={{ color: 'primary', intensity: 500 }}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name}
            />

            <Input
              label="Email address"
              type="email"
              placeholder="ada@example.com"
              color={{ color: 'secondary', intensity: 500 }}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={Boolean(errors.email)}
              helperText={errors.email}
            />

            <Select
              label="Reason for contact"
              placeholder="Choose a reason"
              value={reason}
              onValueChange={setReason}
              color={{ color: 'accent', intensity: 500 }}
            >
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </Select>

            <Textarea
              label="Message"
              placeholder="Tell us what's going on..."
              rows={5}
              color={{ color: 'violet', intensity: 500 }}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              error={Boolean(errors.message)}
              helperText={errors.message ?? 'Max 500 characters.'}
            />

            <RadioGroup
              label="Preferred contact method"
              value={contactMethod}
              onValueChange={setContactMethod}
              color={{ color: 'rose', intensity: 500 }}
            >
              <RadioGroupItem value="email" label="Email" />
              <RadioGroupItem value="phone" label="Phone" />
              <RadioGroupItem value="text" label="Text message" />
            </RadioGroup>

            <Slider
              label="Urgency"
              value={urgency}
              onValueChange={setUrgency}
              min={0}
              max={100}
              step={1}
              color={{ color: 'amber', intensity: 500 }}
              helperText={`${urgencyLabel(urgency[0])} priority`}
            />

            <Switch
              label="Subscribe to product updates"
              checked={subscribe}
              onCheckedChange={setSubscribe}
              color={{ color: 'emerald', intensity: 500 }}
            />

            <Checkbox
              label="I agree to the terms and conditions"
              color={{ color: 'sky', intensity: 500 }}
              required
              checked={agreeToTerms}
              onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
              error={Boolean(errors.terms)}
              helperText={errors.terms}
            />

            <Button type="submit" variant={{ kind: 'filled', color: 'primary', intensity: 500 }} className="w-full">
              Send message
            </Button>

            {submitted && (
              <Text textColor={{ color: 'emerald', intensity: 600 }} className="text-sm text-center">
                Thanks! Your message has been sent.
              </Text>
            )}
          </AnimateBox>
        </form>
      </Box>
    </>
  );
}

export default App;
