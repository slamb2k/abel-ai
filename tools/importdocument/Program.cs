// Copyright (c) Microsoft. All rights reserved.

using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Identity.Client;

namespace ImportDocument;

/// <summary>
/// This console app imports a list of files to the CopilotChat WebAPI document memory store.
/// </summary>
public static class Program
{
    private static string? _accessToken;
    private static string ConnectionString = "DefaultEndpointsProtocol=https;AccountName=stf4ha2ejhdknem;AccountKey=eyAJlMpZKXymt/LN3wCkrcwXC2Uu0MNYsZ4cDJJyt582bTGJJbDF0sktID3uIfLZ3QDNZReSSpWS+AStcFcJGg==;EndpointSuffix=core.windows.net";

    //public static void Main(string[] args)
    //{
    //    Task.WaitAll(TestBlobs());
    //}

    //private async static Task<bool> TestBlobs()
    //{
    //    BlobServiceClient blobServiceClient = new(ConnectionString);
    //    BlobContainerClient containerClient = blobServiceClient.GetBlobContainerClient("chatmemory");

    //    // List all blobs in the container
    //    //await foreach (BlobItem blobItem in containerClient.GetBlobsAsync(BlobTraits.All, BlobStates.All))
    //    //{
    //    //    Console.WriteLine("\t" + blobItem.Name);
    //    //}

    //    BlobClient blobClient = containerClient.GetBlobClient("chatmemory/62f76b5d-7f81-4573-9077-8a32e5f99c7d/1.11 H_L Recording Wastage.pdf");
    //    blobClient.DownloadTo(@"c:\Temp\testing123.pdf");

    //    return true;
    //}

    public static void Main(string[] args)
    {
        using IHost host = Host.CreateDefaultBuilder(args).Build();

        // Ask the service provider for the configuration abstraction.
        IConfiguration hostConfig = host.Services.GetRequiredService<IConfiguration>();

        var config = Config.GetConfig();
        if (!Config.Validate(config))
        {
            Console.WriteLine("Error: Failed to read appsettings.json.");
            return;
        }

        //var filesOption = new Option<IEnumerable<FileInfo>>(name: "--files", description: "The files to import to document memory store.")
        //{
        //    IsRequired = true,
        //    AllowMultipleArgumentsPerToken = true,
        //};

        //var chatCollectionOption = new Option<Guid>(
        //    name: "--chat-id",
        //    description: "Save the extracted context to an isolated chat collection.",
        //    getDefaultValue: () => Guid.Empty
        //);

        //var rootCommand = new RootCommand(
        //    "This console app imports files to the CopilotChat WebAPI's document memory store."
        //)
        //{
        //    filesOption,
        //    chatCollectionOption
        //};

        //rootCommand.SetHandler(async (files, chatCollectionId) =>
        //    {
        //        await ImportFilesAsync(files, config!, chatCollectionId);
        //    },
        //    filesOption,
        //    chatCollectionOption
        //);

        //rootCommand.Invoke(args);

        ImportAll(config!).Wait();
    }

    private static async Task ImportAll(Config config)
    {
        if (config.AuthenticationType == "AzureAd")
        {
            if (await AcquireTokenAsync(config, v => { _accessToken = v; }) == false)
            {
                Console.WriteLine("Error: Failed to acquire access token.");
                return;
            }
            Console.WriteLine($"Successfully acquired access token. Continuing...");
        }

        var fileNames = Directory.GetFiles(@"C:\Temp\Import");
        var fileInfos = fileNames.OrderBy(n => n).Select(f => new FileInfo(f));

        foreach (var fileInfoChunk in fileInfos.Chunk(1))
        {
            await ImportFilesAsync(fileInfoChunk, config!, Guid.Empty);
        }
    }

    /// <summary>
    /// Acquires a user account from Azure AD.
    /// </summary>
    /// <param name="config">The App configuration.</param>
    /// <param name="setAccessToken">Sets the access token to the first account found.</param>
    /// <returns>True if the user account was acquired.</returns>
    private static async Task<bool> AcquireTokenAsync(
        Config config,
        Action<string> setAccessToken)
    {
        Console.WriteLine("Attempting to authenticate user...");

        var webApiScope = $"api://{config.BackendClientId}/{config.Scopes}";
        string[] scopes = { webApiScope };
        try
        {
            var app = PublicClientApplicationBuilder.Create(config.ClientId)
                .WithRedirectUri(config.RedirectUri)
                .WithAuthority(config.Instance, config.TenantId)
                .Build();
            var result = await app.AcquireTokenInteractive(scopes).ExecuteAsync();
            setAccessToken(result.AccessToken);
            return true;
        }
        catch (Exception ex) when (ex is MsalServiceException or MsalClientException)
        {
            Console.WriteLine($"Error: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Conditionally imports a list of files to the Document Store.
    /// </summary>
    /// <param name="files">A list of files to import.</param>
    /// <param name="config">Configuration.</param>
    /// <param name="chatCollectionId">Save the extracted context to an isolated chat collection.</param>
    private static async Task ImportFilesAsync(IEnumerable<FileInfo> files, Config config, Guid chatCollectionId)
    {
        foreach (var file in files)
        {
            if (!file.Exists)
            {
                Console.WriteLine($"File {file.FullName} does not exist.");
                return;
            }
        }

        using var formContent = new MultipartFormDataContent();
        List<StreamContent> filesContent = files.Select(file => new StreamContent(file.OpenRead())).ToList();
        for (int i = 0; i < filesContent.Count; i++)
        {
            formContent.Add(filesContent[i], "formFiles", files.ElementAt(i).Name);
        }


        if (chatCollectionId != Guid.Empty)
        {
            Console.WriteLine($"Uploading and parsing file {files.First().Name} to chat {chatCollectionId}...");

            //await UploadAsync(chatCollectionId);
        }
        else
        {
            Console.WriteLine($"Uploading and parsing file {files.First().Name} to global collection...");

            await UploadAsync();
        }

        // Dispose of all the file streams.
        foreach (var fileContent in filesContent)
        {
            fileContent.Dispose();
        }

        async Task UploadAsync(Guid? chatId = null)
        {
            // Create a HttpClient instance and set the timeout to infinite since
            // large documents will take a while to parse.
            using HttpClientHandler clientHandler = new()
            {
                CheckCertificateRevocationList = true
            };
            using HttpClient httpClient = new(clientHandler)
            {
                Timeout = Timeout.InfiniteTimeSpan
            };

            if (_accessToken != null)
            {
                // Add required properties to the request header.
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_accessToken!}");
            }

            string uriPath =
                chatId.HasValue ?
                $"chat/{chatId}/documents" :
                "documents";

            try
            {
                using HttpResponseMessage response = await httpClient.PostAsync(
                    new Uri(new Uri(config.ServiceUri), uriPath),
                    formContent);

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Failed to process {files.First().Name}. Error: {response.StatusCode} {response.ReasonPhrase}");
                    Console.WriteLine(await response.Content.ReadAsStringAsync());
                    return;
                }

                Console.WriteLine($"{files.First().Name} Uploaded and parsed successfully.");
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Failed to process {files.First().Name}. Error: {ex.Message}");
            }
        }

        // A function that uses DownloadContentAsync from the Azure Blob Storage SDK to retrieve a file from blob storage.
        //async Task<Stream> DownloadContentAsync(string fileName)
        //{
        //    var blobClient = new BlobClient(new Uri(config.StorageUri), config.StorageCredential, config.StorageContainerName, fileName);
        //    var response = await blobClient.DownloadAsync();
        //    return response.Value.Content;



    }
}
