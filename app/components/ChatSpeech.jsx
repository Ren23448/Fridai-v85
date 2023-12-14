"use client";
import "regenerator-runtime";
import { useEffect, useState, useContext } from "react";
import { useMutation } from "@tanstack/react-query";
import { StatementContext } from "@/app/context/statement";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import BrowserSupports from "./BrowserSupports";
import { getSubscriptionInfo } from "../lib/elevenlabs";
import { nanoid } from "nanoid";
import { Dropdown } from "@nextui-org/react";
import { errorMsg } from "../data/errorMsg";
import { MobileSettings } from "./ChatSettings";

const ChatSpeech = () => {
  const defaultLang = "en-US";
  const defaultVoise = "AZnzlk1XvdvUeBnXmlld";
  const [selectedLanguage, setSelectedLanguage] = useState(
    new Set([defaultLang]),
  );
  const [selectedVoise, setSelectedVoise] = useState(new Set([defaultVoise]));
  const [voiseName, setVoiseName] = useState("Yumeko");
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [mutationIsDone, setMutationIsDone] = useState(false);
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const {
    messages,
    textareaRef,
    addMessage,
    removeMessage,
    updateMessage,
    isMessageUpdating,
    setChatStatus,
    setIsLoading,
    isAudioMuted,
    aiVoiseId,
    aiVoiseName,
    setAiVoiseId,
    setAiVoiseName,
  } = useContext(StatementContext);

  async function doAudio() {
    if (
      transcript !== "" &&
      !isAudioMuted &&
      messages.at(-1).text !== errorMsg.limit
    ) {
      setIsLoading(true);
      setChatStatus("loading-audio");
      try {
        const voiseId = selectedVoise?.currentKey ?? defaultVoise;
        // remove links, domains, extra spaces,
        // symbols, emojis, markdown images from AI text.
        const message = messages
          .at(-1)
          .text.substring(0, 1000)
          .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "")
          .replace(/[^\p{L}\p{N}\p{P}\p{Z}{\^\$}]/gu, "")
          .replace(/\[(.+?)\]\((.+?)\)/g, "")
          .replace(/\!\[(.+?)\]\((.+?)\)/g, "")
          .replace(/[*|~|(|)]/g, "")
          .replace(/\s+/g, " ");

        const res = await fetch("/api/elevenlabs", {
          method: "POST",
          body: JSON.stringify({
            data: {
              voiseId,
              message,
            },
          }),
        });
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        new Audio(audioUrl).play();

        setChatStatus(null);
        setIsLoading(false);

        setTimeout(() => {
          textareaRef.current?.focus();
        }, 10);

        setSubscriptionInfo(await getSubscriptionInfo());
      } catch {
        setChatStatus("Error");
      }
    }
    resetTranscript();
    // SpeechRecognition.startListening();
  }

  const { mutate: sendMessage } = useMutation({
    mutationKey: ["sendMessage"],
    // include message to later use it in onMutate
    mutationFn: async (_message) => {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [_message] }),
      });

      return response.body;
    },
    onMutate(message) {
      setChatStatus("thinking");
      setIsLoading(true);
      addMessage(message);
    },
    onSuccess: async (stream) => {
      if (!stream) throw new Error("No stream");

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;

      setChatStatus(null);
      setIsLoading(false);

      // construct new message to add
      const id = nanoid();
      const responseMessage = {
        id,
        isUserMessage: false,
        text: "",
        time: Date.now(),
        ai_voise_id: aiVoiseId,
        ai_voise_name: aiVoiseName,
      };

      // add new message to state
      addMessage(responseMessage);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        updateMessage(id, (prev) => prev + chunkValue);
      }

      // clean up
      setMutationIsDone(true);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 10);
    },
    onError: (_, message) => {
      removeMessage(message.id);
      textareaRef.current?.focus();
    },
  });

  // start audio after transcript mutation is done.
  // save AI and user chat to localStorage and database.
  useEffect(() => {
    (async () => {
      if (mutationIsDone === true) {
        await doAudio();

        if (messages.length > 1 && messages.at(-1).text !== errorMsg.limit) {
          setTimeout(
            () =>
              typeof window !== "undefined" &&
              localStorage.setItem("chat", JSON.stringify(messages)),
            200,
          );

          fetch("/api/supabase", {
            method: "POST",
            body: JSON.stringify({
              data: {
                messages,
              },
            }),
          });
        }
      }
      setMutationIsDone(false);
    })();
  }, [mutationIsDone]);

  // this for the ChatInput
  useEffect(() => {
    (async () => {
      if (
        isMessageUpdating === true &&
        !isAudioMuted &&
        messages.at(-1).text !== errorMsg.limit
      ) {
        setIsLoading(true);
        setChatStatus("loading-audio");
        try {
          const voiseId = selectedVoise?.currentKey ?? defaultVoise;
          // remove links, domains, extra spaces,
          // symbols, emojis, markdown images from AI text.
          const message = messages
            .at(-1)
            .text.substring(0, 1000)
            .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "")
            .replace(/[^\p{L}\p{N}\p{P}\p{Z}{\^\$}]/gu, "")
            .replace(/\[(.+?)\]\((.+?)\)/g, "")
            .replace(/\!\[(.+?)\]\((.+?)\)/g, "")
            .replace(/[*|~|(|)]/g, "")
            .replace(/\s+/g, " ");

          const res = await fetch("/api/elevenlabs", {
            method: "POST",
            body: JSON.stringify({
              data: {
                voiseId,
                message,
              },
            }),
          });
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          new Audio(audioUrl).play();

          setChatStatus(null);
          setIsLoading(false);

          setTimeout(() => {
            textareaRef.current?.focus();
          }, 10);

          setSubscriptionInfo(await getSubscriptionInfo());
        } catch {
          setChatStatus("Error");
        }
      }
    })();
  }, [isMessageUpdating]);

  useEffect(() => {
    (async () => {
      if (transcript.length > 1000) {
        await doAudio();
      }
    })();
  }, [transcript]);

  useEffect(() => {
    if (!listening && transcript) {
      const message = {
        id: nanoid(),
        isUserMessage: true,
        text: transcript,
        time: Date.now(),
      };
      sendMessage(message);
    }
  }, [transcript, listening]);

  useEffect(() => {
    const voiseId = selectedVoise?.currentKey ?? defaultVoise;
    const voises = {
      AZnzlk1XvdvUeBnXmlld: "Yumeko",
      EXAVITQu4vr4xnSDxMaL: "Bella",
      g5CIjZEefAph4nQFvHAz: "A Serial Killer?",
      MF3mGyEYCl7XYWbV9V6O: "Elli",
      jBpfuIE2acCO8z3wKNLl: "Gigi a (Child)",
      jsCqWAovK2LkecY7zXl4: "American girl",
      GBv7mTt0atIp3Br8iCZE: "Bloodthirsty",
    };
    setVoiseName(voises[voiseId]);

    setAiVoiseId(voiseId);
    setAiVoiseName(voises[voiseId]);
  }, [selectedVoise]);

  const startListening = async (lang) => {
    await SpeechRecognition.startListening({ language: lang });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    resetTranscript();
  };

  // dropdown section title
  function dsTitle(title, disc) {
    return (
      <>
        <p className="-mt-8 p-2">{title}</p>
        <p className="-mb-7 -mt-2 p-2">{disc}</p>
      </>
    );
  }

  return (
    <div className="mb-4 mt-4 rounded-lg bg-violet-950 px-2 py-3 shadow-md shadow-violet-500/50 ring-4 ring-violet-900/40 sm:mt-8 sm:py-2">
      <div className="flex flex-row flex-wrap justify-between gap-2">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <button
            className="hidden cursor-pointer flex-row gap-0.5 rounded-md border-none bg-green-700 px-2 py-2 text-sm hover:bg-green-700/50 focus:outline-none focus:ring-4 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-green-700 sm:inline-flex"
            onClick={(e) => {
              e.preventDefault();
              startListening(selectedLanguage?.currentKey ?? defaultLang);
            }}
            disabled={listening}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M8 5.14v14l11-7l-11-7Z" />
            </svg>{" "}
            Start
          </button>
          <button
            className="hidden cursor-pointer flex-row gap-0.5 rounded-md border-none bg-red-700 px-2 py-2 text-sm hover:bg-red-700/50 focus:outline-none focus:ring-4 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-700 sm:inline-flex"
            onClick={stopListening}
            disabled={!listening}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M6 18V6h12v12H6Z" />
            </svg>{" "}
            Stop
          </button>
          <div className="flex flex-row-reverse">
            <Dropdown disableAnimation>
              <Dropdown.Button
                auto
                color="secondary"
                css={{
                  tt: "capitalize",
                  size: "30px",
                  borderRadius: "4px",
                  fontSize: "$xs",
                  marginLeft: "$4",
                  backgroundColor: "rgb(91, 33, 182)",
                  "@xsMax": {
                    display: "none",
                  },
                }}
              >
                {selectedLanguage?.currentKey ?? defaultLang}
              </Dropdown.Button>
              <Dropdown.Menu
                color="secondary"
                disallowEmptySelection
                selectionMode="single"
                selectedKeys={selectedLanguage}
                onSelectionChange={setSelectedLanguage}
              >
                <Dropdown.Section
                  title={dsTitle(
                    "( Select Speech Language )",
                    "works with speech transcript only.",
                  )}
                >
                  <Dropdown.Item key="en-US">English (US)</Dropdown.Item>
                  <Dropdown.Item key="ar-SA">Arabic (SA)</Dropdown.Item>
                  <Dropdown.Item key="ja">Japanese</Dropdown.Item>
                  <Dropdown.Item key="ko">Korean</Dropdown.Item>
                  <Dropdown.Item key="ru">Russian</Dropdown.Item>
                  <Dropdown.Item key="de-DE">German</Dropdown.Item>
                  <Dropdown.Item key="fr-FR">French</Dropdown.Item>
                  <Dropdown.Item key="tr">Turkish</Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown disableAnimation>
              <Dropdown.Button
                auto
                color="secondary"
                className="ml-0 sm:ml-2"
                css={{
                  tt: "capitalize",
                  size: "30px",
                  borderRadius: "4px",
                  fontSize: "$xs",
                  backgroundColor: "rgb(91, 33, 182)",
                }}
              >
                {voiseName}
              </Dropdown.Button>
              <Dropdown.Menu
                color="secondary"
                disallowEmptySelection
                selectionMode="single"
                selectedKeys={selectedVoise}
                onSelectionChange={setSelectedVoise}
              >
                <Dropdown.Section
                  title={dsTitle(
                    "( Select AI Speak Voice )",
                    "this only effict to the sound output and not inclouding charecters.",
                  )}
                >
                  <Dropdown.Item key="AZnzlk1XvdvUeBnXmlld">
                    Yumeko (default)
                  </Dropdown.Item>
                  <Dropdown.Item key="EXAVITQu4vr4xnSDxMaL">
                    Bella \ Nice Person
                  </Dropdown.Item>
                  <Dropdown.Item key="g5CIjZEefAph4nQFvHAz">
                    A Serial Killer?
                  </Dropdown.Item>
                  <Dropdown.Item key="MF3mGyEYCl7XYWbV9V6O">
                    Elli Is Enthusiastic
                  </Dropdown.Item>
                  <Dropdown.Item key="jBpfuIE2acCO8z3wKNLl">
                    Gigi Annoying (child)
                  </Dropdown.Item>
                  <Dropdown.Item key="jsCqWAovK2LkecY7zXl4">
                    Average American Girl
                  </Dropdown.Item>
                  <Dropdown.Item key="GBv7mTt0atIp3Br8iCZE">
                    Bloodthirsty
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
        <span className="hidden text-right text-neutral-300 sm:block">
          Transcript ({transcript.length}/1000)
        </span>
        <div className="flex gap-3 sm:hidden">
          <MobileSettings />
        </div>
      </div>

      <pre className="mt-3 hidden min-h-[48px] rounded-sm border-4 border-dashed border-violet-700 bg-violet-900 p-2 sm:block">
        <BrowserSupports />
      </pre>
      <div className="hidden justify-end pt-1 text-xs text-neutral-400 sm:flex">
        {subscriptionInfo ? (
          <p>
            Total quota remaining:{" "}
            {subscriptionInfo.character_limit -
              subscriptionInfo.character_count}
          </p>
        ) : (
          <p className="flex-auto">
            Notice: This is a transcript (Speech to Text) 🎙️ that Converts your
            voice to text and then sends it to AI.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatSpeech;
