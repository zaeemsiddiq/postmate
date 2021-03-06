import { ipcRenderer } from "electron";
import React, { useState, useEffect } from "react";
import { Grid } from "semantic-ui-react";

import loadApiDoc from "../api-loader/api-loader";

import { ApiDoc, ApiRequest, Variables, ApiEnvironment } from "../model/model";

import ApiLocation from "./ApiLocation";
import RequestList from "./RequestList";
import RequestOperationPanel from "./RequestOperationPanel";
import VariablesPanel from "./VariablesPanel";

import { get as getSettings, set as setSettings } from "../settings/settings";

const Main: React.FC = () => {
  const [doc, setDoc] = useState<ApiDoc>(new ApiDoc());
  const [apiDocLocation, updateApiDocLocation] = useState("");
  const [activeRequest, setActiveRequest] = useState<ApiRequest>(
    new ApiRequest()
  );
  const [currVariables, updateCurrentVariables] = useState<Variables>({});
  const [variablesOrigin, updateVariableOrigin] = useState<{[index:string]:string}>({});
  const isMockServerRuning = !!currVariables['MOCK_CALLBACK_PORT'];

  useEffect(() => {
    const updateVars = (_: any, msg: Variables) => {
      const allVariables: Variables = { ...currVariables, ...msg };
      updateCurrentVariables(allVariables);
    };
    async function messagesWithMain() {
      ipcRenderer.on("newVariables", updateVars);
    }
    messagesWithMain();
    return () => {
      ipcRenderer.off("newVariables", updateVars);
    };
  }, [currVariables]);
  useEffect(() => {
    async function load() {
      try {
        const setting = await getSettings();
        const newDoc = await loadApiDoc(setting.apiDocLocation);
        updateApiDocLocation(setting.apiDocLocation);
        setDoc(newDoc);
      } catch (e) {
        console.warn(e);
      }
    }
    load();
  }, []);

  function onPickEnv(env: ApiEnvironment) {
    const allVariables: Variables = { ...currVariables, ...env.variables };
    const envOrigin: { [index: string]: string } = {};
    for (const key of Object.keys(env.variables)) {
      envOrigin[key] = env.name;
    }
    updateVariableOrigin({ ...variablesOrigin, ...envOrigin });
    updateCurrentVariables(allVariables);
  }

  function onExtractVariable(vars: Variables) {
    const allVariables: Variables = { ...currVariables, ...vars };
    updateCurrentVariables(allVariables);
  }

  function onStartMockServer() {
    ipcRenderer.send("startMockServer");
  }

  function onStopMockServer() {
    ipcRenderer.send('stopMockServer');
  }

  function onUpdateVariables(newVar: Variables) {
    updateCurrentVariables({ ...currVariables, ...newVar });
  }

  return (
    <Grid className="Main">
      <Grid.Row className="apiLocationRow">
        <Grid.Column width={16}>
          <ApiLocation
            location={apiDocLocation}
            onSync={async (location: string) => {
              try {
                const doc = await loadApiDoc(location);
                await setSettings({ apiDocLocation: location });
                updateApiDocLocation(apiDocLocation);
                setDoc(doc);
                alert(`Load success: ${location}`);
              } catch (e) {
                console.warn(e);
                alert(`Load failed: ${location}`);
              }
            }}
            onOpen={location => {
              ipcRenderer.send("openFile", location);
            }}
          />
        </Grid.Column>
      </Grid.Row>
      <Grid.Row>
        <Grid.Column width={4}>
          <RequestList doc={doc} onActivateRequest={setActiveRequest} />
        </Grid.Column>
        <Grid.Column width={8}>
          <RequestOperationPanel
            request={activeRequest}
            variables={currVariables}
            certs={doc.certs}
            onExtractVariable={onExtractVariable}
          />
        </Grid.Column>
        <Grid.Column width={4}>
          <VariablesPanel
            currVariables={currVariables}
            variablesOrigin={variablesOrigin}
            environments={doc.environments}
            onPickEnv={onPickEnv}
            isMockServerRuning={isMockServerRuning}
            onStartMockServer={onStartMockServer}
            onStopMockServer={onStopMockServer}
            onUpdateVariables={onUpdateVariables}
          />
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
};

export default Main;
